/**
 * Zod schemas for the auth routes.
 *
 * Lives in its own file so unit tests can import the rules without dragging
 * in the full route handler (which transitively pulls db.ts, the email
 * service, etc.). Same pattern as sync-security.ts.
 *
 * If you change a schema here, update `auth-flow.test.ts` accordingly.
 *
 * Note: these schemas enforce input *shape* and *length*. Stronger password
 * rules (must contain upper + lower + digit) are enforced separately in the
 * route handler via `validatePasswordStrength` from ../auth, because the
 * exact error messages differ from Zod's.
 */
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
