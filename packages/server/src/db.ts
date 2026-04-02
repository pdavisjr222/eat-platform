import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as pgSchema from "./schema";
import * as sqliteSchema from "@eat/shared/schema";

// Block SQLite in production — must use PostgreSQL
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required in production. SQLite is not supported.");
  process.exit(1);
}

/**
 * Database connection — auto-selects adapter:
 *   DATABASE_URL set  → Neon serverless PostgreSQL (production)
 *   DATABASE_URL unset → better-sqlite3 (local development only)
 */
export const db: NeonHttpDatabase<typeof pgSchema> = process.env.DATABASE_URL
  ? drizzleNeon(neon(process.env.DATABASE_URL), { schema: pgSchema })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : drizzleSqlite(new Database(process.env.DATABASE_PATH || "./db.sqlite"), { schema: sqliteSchema }) as any;

export type DB = typeof db;
