import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { db } from "./db";
import { users, auditLogs } from "./schema";
import { eq } from "drizzle-orm";
import { verifyToken, type AuthRequest } from "./auth";

// CORS configuration
export const corsMiddleware = cors({
  origin: config.nodeEnv === "production"
    ? [config.domain, config.appUrl]
    : true, // Allow all origins in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Security headers - disable CSP in development to allow Vite HMR
export const securityMiddleware = helmet({
  contentSecurityPolicy: config.nodeEnv === "development"
    ? false // Disable CSP in development for Vite HMR
    : {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https://*.googleapis.com", "https://*.gstatic.com"],
          scriptSrc: ["'self'", "https://maps.googleapis.com", "https://js.stripe.com"],
          frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
          connectSrc: ["'self'", "https://maps.googleapis.com", "https://api.stripe.com", "wss:"],
        },
      },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting - general API (more lenient in development)
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.nodeEnv === "development" ? 1000 : config.rateLimitMaxRequests,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets in development
    if (req.path === "/api/health") return true;
    if (config.nodeEnv === "development" && !req.path.startsWith("/api")) return true;
    return false;
  },
});

// Rate limiting - auth endpoints (stricter, but more lenient in dev)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === "development" ? 100 : 10, // More attempts allowed in dev
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - file uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: { error: "Upload limit reached, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check if user is active and not banned
export async function checkUserStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return next();
  }

  const [user] = await db
    .select({ isActive: users.isActive, isBanned: users.isBanned, bannedReason: users.bannedReason })
    .from(users)
    .where(eq(users.id, req.userId));

  if (!user) {
    return res.status(401).json({ error: "User not found" });
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

  next();
}

// Check if email is verified (for certain actions)
export async function requireEmailVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const [user] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, req.userId));

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      error: "Email verification required",
      message: "Please verify your email address to perform this action",
    });
  }

  next();
}

// Role-based access control
type Role = "user" | "moderator" | "admin";

const roleHierarchy: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

export function requireRole(...allowedRoles: Role[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.userId));

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userRole = user.role as Role;
    const hasPermission = allowedRoles.some(
      (role) => roleHierarchy[userRole] >= roleHierarchy[role]
    );

    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Add role to request for downstream use
    (req as any).userRole = userRole;
    next();
  };
}

// Require admin role
export const requireAdmin = requireRole("admin");

// Require moderator or admin role
export const requireModerator = requireRole("moderator", "admin");

// Check if user is premium
export async function requirePremium(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const [user] = await db
    .select({ isPremium: users.isPremium, premiumExpiresAt: users.premiumExpiresAt })
    .from(users)
    .where(eq(users.id, req.userId));

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (!user.isPremium) {
    return res.status(403).json({
      error: "Premium subscription required",
      message: "Upgrade to premium to access this feature",
    });
  }

  // Check if subscription has expired
  if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
    return res.status(403).json({
      error: "Premium subscription expired",
      message: "Please renew your subscription to continue",
    });
  }

  next();
}

// Audit logging for admin actions
export async function logAuditAction(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValues: Record<string, any> | null,
  newValues: Record<string, any> | null,
  req: Request
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

// Input sanitization helper
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
}

// Pagination helper
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    config.maxPageSize,
    Math.max(1, parseInt(req.query.limit as string) || config.defaultPageSize)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Build pagination response
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({ error: "Request timeout" });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timeout));
    res.on("close", () => clearTimeout(timeout));
    next();
  };
}

// Optional authentication (doesn't fail if no token)
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
    }
  }

  next();
}
