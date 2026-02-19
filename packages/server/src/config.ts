import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  appUrl: process.env.APP_URL || "http://localhost:5000",
  domain: process.env.DOMAIN || "https://projecteat.org",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "default-secret-change-in-production",
  jwtExpiresIn: "7d",

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",

  // Resend Email
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@projecteat.org",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  // Agora
  agoraAppId: process.env.AGORA_APP_ID || "",
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || "",

  // File Upload
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),

  // Pagination defaults
  defaultPageSize: 20,
  maxPageSize: 100,
};

// Validate required config in production
if (config.nodeEnv === "production") {
  const required = ["JWT_SECRET", "RESEND_API_KEY", "GOOGLE_MAPS_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export default config;
