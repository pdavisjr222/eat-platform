import { Router } from "express";
import express from "express";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
} from "../middleware";
import {
  isStripeConfigured,
  createSubscriptionCheckout,
  handleSubscriptionSuccess,
  cancelSubscription,
  getSubscriptionStatus,
  handleStripeWebhook,
  SUBSCRIPTION_PLANS,
} from "../stripe";

const router = Router();

router.get("/api/subscription/plans", authenticateToken, async (req: AuthRequest, res) => {
  res.json({
    monthly: SUBSCRIPTION_PLANS.monthly,
    yearly: SUBSCRIPTION_PLANS.yearly,
    stripeConfigured: isStripeConfigured(),
  });
});

router.get("/api/subscription/status", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const status = await getSubscriptionStatus(req.userId!);
    res.json(status);
  } catch (error: any) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

router.post("/api/subscription/checkout", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { planType } = req.body;

    if (!planType || !["monthly", "yearly"].includes(planType)) {
      return res.status(400).json({ error: "Valid plan type is required (monthly or yearly)" });
    }

    const result = await createSubscriptionCheckout(req.userId!, planType);

    if ("error" in result) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ url: result.url });
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/api/subscription/success", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const success = await handleSubscriptionSuccess(sessionId);

    if (success) {
      res.json({ success: true, message: "Subscription activated successfully" });
    } else {
      res.status(400).json({ error: "Could not verify subscription" });
    }
  } catch (error: any) {
    console.error("Error handling subscription success:", error);
    res.status(500).json({ error: "Failed to process subscription" });
  }
});

router.post("/api/subscription/cancel", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const result = await cancelSubscription(req.userId!);

    if (result.success) {
      res.json({ success: true, message: "Subscription cancelled" });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Stripe webhook endpoint
router.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const result = await handleStripeWebhook(req.body, signature);

      if (result.received) {
        res.json({ received: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  }
);

export default router;
