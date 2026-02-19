import Stripe from "stripe";
import { config } from "./config";
import { db } from "./db";
import { users, payments, creditTransactions, subscriptionPlans } from "@eat/shared/schema";
import { eq } from "drizzle-orm";

// Initialize Stripe (will be null if no API key)
const stripe = config.stripeSecretKey && !config.stripeSecretKey.includes("PLACEHOLDER")
  ? new Stripe(config.stripeSecretKey, { apiVersion: "2025-03-31.basil" })
  : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

// Subscription plan prices (in cents)
export const SUBSCRIPTION_PLANS = {
  monthly: {
    name: "E.A.T. Premium Monthly",
    price: 999, // $9.99
    interval: "month" as const,
    features: [
      "Access to all premium training modules",
      "Featured listings (2 per month)",
      "Priority support",
      "Advanced analytics",
      "No ads",
    ],
  },
  yearly: {
    name: "E.A.T. Premium Yearly",
    price: 9999, // $99.99 (save ~17%)
    interval: "year" as const,
    features: [
      "Access to all premium training modules",
      "Featured listings (unlimited)",
      "Priority support",
      "Advanced analytics",
      "No ads",
      "2 months free",
    ],
  },
};

// Create or get Stripe customer
export async function getOrCreateStripeCustomer(userId: string): Promise<string | null> {
  if (!stripe) {
    console.log("Stripe not configured");
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error("User not found");
  }

  // Return existing customer ID if available
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user.id,
    },
  });

  // Save customer ID to user
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}

// Create checkout session for subscription
export async function createSubscriptionCheckout(
  userId: string,
  planType: "monthly" | "yearly"
): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    return { error: "Payment processing is not configured. Please contact support." };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(userId);
    if (!customerId) {
      return { error: "Could not create customer" };
    }

    const plan = SUBSCRIPTION_PLANS[planType];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description: plan.features.join(" | "),
            },
            unit_amount: plan.price,
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/subscription/cancel`,
      metadata: {
        userId,
        planType,
      },
    });

    return { url: session.url! };
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return { error: error.message || "Failed to create checkout session" };
  }
}

// Handle successful subscription
export async function handleSubscriptionSuccess(sessionId: string): Promise<boolean> {
  if (!stripe) return false;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return false;
    }

    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType as "monthly" | "yearly";

    if (!userId) return false;

    const plan = SUBSCRIPTION_PLANS[planType];
    const now = new Date();
    const expiresAt = new Date(now);

    if (planType === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update user to premium
    await db
      .update(users)
      .set({
        isPremium: true,
        premiumExpiresAt: expiresAt,
        stripeSubscriptionId: session.subscription as string,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Record payment
    await db.insert(payments).values({
      userId,
      amount: plan.price / 100,
      currency: "USD",
      status: "completed",
      paymentMethod: "stripe",
      stripePaymentIntentId: session.payment_intent as string,
      description: `${plan.name} subscription`,
      metadata: { sessionId, planType },
    });

    return true;
  } catch (error) {
    console.error("Subscription success handling error:", error);
    return false;
  }
}

// Cancel subscription
export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!stripe) {
    return { success: false, error: "Payment processing not configured" };
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user || !user.stripeSubscriptionId) {
      return { success: false, error: "No active subscription found" };
    }

    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    await db
      .update(users)
      .set({
        isPremium: false,
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error: any) {
    console.error("Subscription cancellation error:", error);
    return { success: false, error: error.message };
  }
}

// Get subscription status
export async function getSubscriptionStatus(userId: string): Promise<{
  isPremium: boolean;
  expiresAt: Date | null;
  plan?: string;
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    return { isPremium: false, expiresAt: null };
  }

  // Check if subscription has expired
  if (user.isPremium && user.premiumExpiresAt) {
    if (new Date(user.premiumExpiresAt) < new Date()) {
      // Subscription expired, update user
      await db
        .update(users)
        .set({ isPremium: false, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return { isPremium: false, expiresAt: null };
    }
  }

  return {
    isPremium: user.isPremium,
    expiresAt: user.premiumExpiresAt,
  };
}

// Create one-time payment for credits (future use)
export async function createCreditsPayment(
  userId: string,
  amount: number,
  credits: number
): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    return { error: "Payment processing is not configured" };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(userId);
    if (!customerId) {
      return { error: "Could not create customer" };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} E.A.T. Credits`,
              description: "Credits for the E.A.T. platform",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/credits/cancel`,
      metadata: {
        userId,
        credits: credits.toString(),
        type: "credits",
      },
    });

    return { url: session.url! };
  } catch (error: any) {
    console.error("Credits payment error:", error);
    return { error: error.message || "Failed to create payment session" };
  }
}

// Webhook handler for Stripe events
export async function handleStripeWebhook(
  body: Buffer,
  signature: string
): Promise<{ received: boolean; error?: string }> {
  if (!stripe) {
    return { received: false, error: "Stripe not configured" };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleSubscriptionSuccess(session.id);
        } else if (session.metadata?.type === "credits") {
          // Handle credits purchase
          const userId = session.metadata.userId;
          const credits = parseInt(session.metadata.credits, 10);

          await db.insert(creditTransactions).values({
            userId,
            type: "purchased",
            amount: credits,
            description: `Purchased ${credits} credits`,
            relatedEntityType: "payment",
            relatedEntityId: session.payment_intent as string,
          });

          await db
            .update(users)
            .set({
              creditBalance: db
                .select({ val: users.creditBalance })
                .from(users)
                .where(eq(users.id, userId)),
            })
            .where(eq(users.id, userId));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));

        if (user) {
          await db
            .update(users)
            .set({
              isPremium: false,
              stripeSubscriptionId: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for invoice:", invoice.id);
        // Could send email notification here
        break;
      }
    }

    return { received: true };
  } catch (error: any) {
    console.error("Webhook error:", error);
    return { received: false, error: error.message };
  }
}
