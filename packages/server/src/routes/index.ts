import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { config } from "../config";
import {
  corsMiddleware,
  securityMiddleware,
  apiRateLimiter,
} from "../middleware";

import { messageService } from "../services/messaging";
import authRouter from "./auth";
import membersRouter from "./members";
import listingsRouter from "./listings";
import vendorsRouter from "./vendors";
import foragingRouter from "./foraging";
import eventsRouter from "./events";
import trainingRouter from "./training";
import jobsRouter from "./jobs";
import messagingRouter from "./messaging";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";
import subscriptionsRouter from "./subscriptions";
import adminRouter from "./admin";
import miscRouter from "./misc";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global middleware
  app.use(corsMiddleware);
  app.use(securityMiddleware);
  app.use(apiRateLimiter);

  // Serve uploaded files — cross-origin so the Vercel frontend can load images from Railway
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(path.join(process.cwd(), config.uploadDir))
  );

  // Register all route modules
  app.use(miscRouter);
  app.use(authRouter);
  app.use(membersRouter);
  app.use(listingsRouter);
  app.use(vendorsRouter);
  app.use(foragingRouter);
  app.use(eventsRouter);
  app.use(trainingRouter);
  app.use(jobsRouter);
  app.use(messagingRouter);
  app.use(reviewsRouter);
  app.use(notificationsRouter);
  app.use(subscriptionsRouter);
  app.use(adminRouter);

  // Import and register sync routes
  const syncRoutes = (await import("./v1/sync")).default;
  app.use("/api/v1/sync", syncRoutes);

  // Import and register device routes
  const deviceRoutes = (await import("./v1/devices")).default;
  app.use("/api/v1/devices", deviceRoutes);

  const httpServer = createServer(app);

  // Attach Socket.IO to the HTTP server — must happen after createServer
  messageService.setupWebSocket(httpServer);

  return httpServer;
}
