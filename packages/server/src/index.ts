import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { requestTimeout } from "./middleware";
import logger from "./logger";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "site@sitemedia.us";

async function runMigrations() {
  try {
    await db.execute(
      "ALTER TABLE foraging_spots ADD COLUMN IF NOT EXISTS other_names text" as any
    );
    logger.info("Migrations: foraging_spots.other_names ready");
  } catch (err) {
    // In production, migration failures are fatal
    if (process.env.NODE_ENV === "production") {
      logger.error(`Migration failed: ${err}`);
      process.exit(1);
    }
    logger.warn(`Migration warning: ${err}`);
  }
}

async function ensureAdminUser() {
  try {
    const [existing] = await db.select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existing && existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.email, ADMIN_EMAIL));
      logger.info(`Promoted ${ADMIN_EMAIL} to admin`);
    } else if (!existing) {
      logger.info(`Admin user ${ADMIN_EMAIL} not found yet — will be promoted on first signup`);
    }
  } catch (err) {
    logger.warn(`Could not check admin user: ${err}`);
  }
}

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Parse JSON body — 2mb limit; use multipart uploads for large files
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.info({
        method: req.method,
        path,
        status: res.statusCode,
        duration,
        ...(res.statusCode >= 400 && capturedJsonResponse
          ? { response: capturedJsonResponse }
          : {}),
      }, `${req.method} ${path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Health check — before any middleware that might reject
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Apply request timeout middleware
  app.use(requestTimeout(30000));

  await runMigrations();
  await ensureAdminUser();
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ err, status }, "Unhandled server error");
    res.status(status).json({ error: message });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      logger.info({ port, env: process.env.NODE_ENV || "development" }, `E.A.T. API server running on port ${port}`);
    }
  );
})();
