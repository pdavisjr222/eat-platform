import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  validatePasswordStrength,
  hashPassword,
  comparePasswords,
  generateToken,
  verifyToken,
  generateSecureToken,
  generateVerificationToken,
  generatePasswordResetToken,
  generateReferralCode,
  sanitizeUser,
} from "../auth";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user+tag@domain.org")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("missing@")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("has spaces@domain.com")).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts strong passwords", () => {
    const result = validatePasswordStrength("StrongP1ss");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects short passwords", () => {
    const result = validatePasswordStrength("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long");
  });

  it("rejects passwords without uppercase", () => {
    const result = validatePasswordStrength("lowercase1only");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("rejects passwords without lowercase", () => {
    const result = validatePasswordStrength("UPPERCASE1ONLY");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one lowercase letter");
  });

  it("rejects passwords without numbers", () => {
    const result = validatePasswordStrength("NoNumbersHere");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one number");
  });

  it("returns multiple errors for very weak passwords", () => {
    const result = validatePasswordStrength("abc");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("password hashing", () => {
  it("hashes and verifies passwords", async () => {
    const password = "TestPass1";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await comparePasswords(password, hash)).toBe(true);
    expect(await comparePasswords("WrongPass1", hash)).toBe(false);
  });
});

describe("JWT tokens", () => {
  it("generates and verifies tokens", () => {
    // Set a secret for testing
    process.env.JWT_SECRET = "test-secret-for-unit-tests-minimum-length";
    // Re-import won't help since config is cached, but generateToken uses config.jwtSecret
    // We need to work with what config loaded. If jwtSecret is empty, sign will use ""
    const token = generateToken("user-123");
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-123");
  });

  it("returns null for invalid tokens", () => {
    expect(verifyToken("garbage.token.here")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});

describe("token generation", () => {
  it("generates 64-char hex secure tokens", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generates verification tokens with 24h expiry", () => {
    const { token, expires } = generateVerificationToken();
    expect(token).toHaveLength(64);
    const diff = expires.getTime() - Date.now();
    // Should be close to 24 hours (within 5 seconds)
    expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
    expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("generates password reset tokens with 1h expiry", () => {
    const { token, expires } = generatePasswordResetToken();
    expect(token).toHaveLength(64);
    const diff = expires.getTime() - Date.now();
    expect(diff).toBeGreaterThan(60 * 60 * 1000 - 5000);
    expect(diff).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("generates 10-char uppercase hex referral codes", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(10);
    expect(/^[0-9A-F]+$/.test(code)).toBe(true);
  });
});

describe("sanitizeUser", () => {
  it("removes sensitive fields", () => {
    const user = {
      id: "1",
      name: "Test",
      email: "test@test.com",
      passwordHash: "secret-hash",
      emailVerificationToken: "token123",
      emailVerificationExpires: new Date(),
      passwordResetToken: "reset123",
      passwordResetExpires: new Date(),
      stripeCustomerId: "cus_123",
    };
    const safe = sanitizeUser(user);
    expect(safe.id).toBe("1");
    expect(safe.name).toBe("Test");
    expect(safe.email).toBe("test@test.com");
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe).not.toHaveProperty("emailVerificationToken");
    expect(safe).not.toHaveProperty("emailVerificationExpires");
    expect(safe).not.toHaveProperty("passwordResetToken");
    expect(safe).not.toHaveProperty("passwordResetExpires");
    expect(safe).not.toHaveProperty("stripeCustomerId");
  });
});
