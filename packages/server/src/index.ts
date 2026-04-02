import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { requestTimeout } from "./middleware";
import logger from "./logger";

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
  // Apply request timeout middleware
  app.use(requestTimeout(30000));

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
