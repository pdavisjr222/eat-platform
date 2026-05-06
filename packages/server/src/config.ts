import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  appUrl: process.env.APP_URL || "http://localhost:5000",
  domain: process.env.DOMAIN || "https://projecteat.org",
  webUrl: process.env.WEB_URL || "https://eat-platform-web.vercel.app",

  // JWT -- no fallback; validated below in production
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: "7d",
  // Admin sessions expire faster than regular sessions because admins have
  // access to private member data; a stolen admin token is more dangerous.
  jwtAdminExpiresIn: "1d",

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",

  // Resend Email
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@mail.projecteat.org",

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

  // Redis
  // Empty string when REDIS_URL is unset -- middleware checks for this and
  // falls back to MemoryStore. Local dev or test runs that want Redis
  // should set REDIS_URL explicitly (e.g. "redis://localhost:6379").
  redisUrl: process.env.REDIS_URL || "",

  // Database -- SQLite fallback disabled in production (validated below)
  databaseUrl: process.env.DATABASE_URL || "",
  databasePath: process.env.DATABASE_PATH || "./db.sqlite",

  // Pagination defaults
  defaultPageSize: 20,
  maxPageSize: 100,
};

// Guardrail: the Vercel slug "eat-platform.vercel.app" (without -web) currently
// hosts an unrelated app ("EDGE Talent Engine"). If WEB_URL is pointed there, every
// verification-email link breaks for new signups. Force the correct URL so a
// misconfigured Railway env var cannot silently kill the signup flow again.
const CORRECT_WEB_URL = "https://eat-platform-web.vercel.app";
const KNOWN_WRONG_WEB_URLS = new Set([
  "https://eat-platform.vercel.app",
  "http://eat-platform.vercel.app",
  "https://eat-platform.vercel.app/",
  "http://eat-platform.vercel.app/",
]);

const normalizedWebUrl = config.webUrl.trim().toLowerCase().replace(/\/+$/, "");
if (KNOWN_WRONG_WEB_URLS.has(config.webUrl.trim().toLowerCase()) || normalizedWebUrl === "https://eat-platform.vercel.app") {
  process.stderr.write(
    `[Config] WEB_URL was set to "${config.webUrl}" which is a different team's Vercel project ` +
    `("EDGE Talent Engine"). Overriding to "${CORRECT_WEB_URL}" so verification email links work. ` +
    `Update the Railway env var to silence this warning.\n`
  );
  config.webUrl = CORRECT_WEB_URL;
}

// Validate required config in production
if (config.nodeEnv === "production") {
  // Hard required -- server cannot function without these
  const hardRequired = ["JWT_SECRET", "DATABASE_URL"];
  const hardMissing = hardRequired.filter((key) => !process.env[key]);
  if (hardMissing.length > 0) {
    process.stderr.write(`FATAL: Missing required environment variables: ${hardMissing.join(", ")}\n`);
    process.exit(1);
  }

  // Fail on weak JWT secrets in production
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    process.stderr.write("FATAL: JWT_SECRET must be at least 32 characters in production\n");
    process.exit(1);
  }

  // Soft required -- features degrade gracefully without these
  const softRequired = ["RESEND_API_KEY", "GOOGLE_MAPS_API_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY", "AGORA_APP_ID", "FIREBASE_PROJECT_ID", "REDIS_URL"];
  const softMissing = softRequired.filter((key) => !process.env[key]);
  if (softMissing.length > 0) {
    // Use process.stderr to avoid dependency on logger (config loads before logger is initialized)
    process.stderr.write(`WARNING: Missing optional environment variables (features will be disabled): ${softMissing.join(", ")}\n`);
  }
}

export default config;
