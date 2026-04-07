import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as pgSchema from "./schema";

if (!process.env.DATABASE_URL) {
  // In local dev without DATABASE_URL, warn — SQLite fallback handled at runtime
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: DATABASE_URL is required in production.");
    process.exit(1);
  }
}

// Production always uses Neon PostgreSQL via DATABASE_URL
// Local dev: set DATABASE_URL to a local postgres or use tsx with the shared SQLite setup
const connectionString = process.env.DATABASE_URL
  || (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("DATABASE_URL is required in production"); })()
    : "postgresql://localhost/eat_dev");

export const db: NeonHttpDatabase<typeof pgSchema> = drizzleNeon(
  neon(connectionString as string),
  { schema: pgSchema }
);

export type DB = typeof db;
