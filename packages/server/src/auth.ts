import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Admin tokens expire faster than regular tokens because admin sessions have
// access to private member data; a stolen admin token is higher-risk. An
// impersonation token also carries an impersonatorId claim so the audit trail
// survives the swap.
export function generateToken(
  userId: string,
  options?: { role?: string; impersonatorId?: string }
): string {
  const isAdminLike = options?.role === "admin" || options?.role === "moderator";
  const expiresIn = isAdminLike ? config.jwtAdminExpiresIn : config.jwtExpiresIn;
  const payload: Record<string, unknown> = { userId };
  if (options?.impersonatorId) payload.impersonatorId = options.impersonatorId;
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as `${number}${"s" | "m" | "h" | "d"}`,
  });
}

export function verifyToken(
  token: string
): { userId: string; impersonatorId?: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as {
      userId: string;
      impersonatorId?: string;
    };
  } catch (error) {
    return null;
  }
}

// Generate secure random token for email verification and password reset
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generate verification token with expiration (24 hours)
export function generateVerificationToken(): { token: string; expires: Date } {
  return {
    token: generateSecureToken(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
}

// Generate password reset token with expiration (1 hour)
export function generatePasswordResetToken(): { token: string; expires: Date } {
  return {
    token: generateSecureToken(),
    expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
}

// Generate referral code
export function generateReferralCode(): string {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: "user" | "moderator" | "admin";
  // Set when the JWT was issued via admin impersonation; carries the
  // original admin's id so audit logs can attribute actions correctly.
  impersonatorId?: string;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = payload.userId;
  if (payload.impersonatorId) req.impersonatorId = payload.impersonatorId;
  next();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Sanitize user output (remove sensitive fields)
export function sanitizeUser(user: any): any {
  const {
    passwordHash,
    emailVerificationToken,
    emailVerificationExpires,
    passwordResetToken,
    passwordResetExpires,
    stripeCustomerId,
    ...safeUser
  } = user;

  return safeUser;
}
