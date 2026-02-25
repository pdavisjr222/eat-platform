import { Router } from "express";
import { authenticateToken } from "../auth";
import { config } from "../config";
import { isStripeConfigured } from "../stripe";

const router = Router();

router.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    stripe: isStripeConfigured(),
  });
});

router.get("/api/config/maps", authenticateToken, (req, res) => {
  res.json({
    apiKey: config.googleMapsApiKey,
  });
});

export default router;
