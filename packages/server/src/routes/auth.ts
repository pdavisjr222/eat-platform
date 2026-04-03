import { Router } from "express";
import { db } from "../db";
import { config } from "../config";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  generateVerificationToken,
  generatePasswordResetToken,
  generateReferralCode,
  authenticateToken,
  sanitizeUser,
  type AuthRequest,
} from "../auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../email";
import {
  authRateLimiter,
  checkUserStatus,
} from "../middleware";
import {
  users,
  creditTransactions,
} from "../schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.post("/api/auth/signup", authRateLimiter, async (req, res) => {
  try {
    const { name, email, password, country, region, city, referralCode: referrerCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if email exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const referralCode = generateReferralCode();
    const verificationData = generateVerificationToken();

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        country,
        region,
        city,
        referralCode,
        emailVerificationToken: verificationData.token,
        emailVerificationExpires: verificationData.expires,
      })
      .returning();

    // Handle referral
    if (referrerCode) {
      const [referrer] = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, referrerCode.toUpperCase()))
        .limit(1);

      if (referrer) {
        await db
          .update(users)
          .set({ referredBy: referrer.id })
          .where(eq(users.id, newUser.id));

        // Give referral bonuses
        await db.insert(creditTransactions).values([
          {
            userId: referrer.id,
            type: "referral_bonus",
            amount: 50,
            description: `Referral bonus for inviting ${name}`,
          },
          {
            userId: newUser.id,
            type: "referral_bonus",
            amount: 25,
            description: "Welcome bonus for using a referral code",
          },
        ]);

        await db
          .update(users)
          .set({ creditBalance: sql`${users.creditBalance} + 50` })
          .where(eq(users.id, referrer.id));

        await db
          .update(users)
          .set({ creditBalance: sql`${users.creditBalance} + 25` })
          .where(eq(users.id, newUser.id));
      }
    }

    // Auto-promote known admin email
    if (email.toLowerCase() === "site@sitemedia.us") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, newUser.id));
    }

    // Send verification email — if it fails, delete the user so they can retry
    const emailSent = await sendVerificationEmail(email, name, verificationData.token);

    if (!emailSent) {
      await db.delete(users).where(eq(users.id, newUser.id));
      return res.status(500).json({
        error: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      message: "Account created. Please check your email to verify your account before logging in.",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: "Account suspended",
        reason: user.bannedReason || "Contact support for more information",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email before logging in. Check your inbox.",
        needsVerification: true,
      });
    }

    const isValid = await comparePasswords(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    res.json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
      return res.status(400).json({ error: "Verification token has expired" });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    res.json({ message: "Email verified successfully" });
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/api/auth/resend-verification", authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.json({ message: "If the email exists, a verification email will be sent" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const verificationData = generateVerificationToken();

    await db
      .update(users)
      .set({
        emailVerificationToken: verificationData.token,
        emailVerificationExpires: verificationData.expires,
      })
      .where(eq(users.id, user.id));

    await sendVerificationEmail(user.email, user.name, verificationData.token);

    res.json({ message: "Verification email sent" });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

router.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If the email exists, a reset link will be sent" });
    }

    const resetData = generatePasswordResetToken();

    await db
      .update(users)
      .set({
        passwordResetToken: resetData.token,
        passwordResetExpires: resetData.expires,
      })
      .where(eq(users.id, user.id));

    await sendPasswordResetEmail(user.email, user.name, resetData.token);

    res.json({ message: "If the email exists, a reset link will be sent" });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/api/auth/reset-password", authRateLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
      return res.status(400).json({ error: "Reset token has expired" });
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

router.get("/api/auth/me", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
