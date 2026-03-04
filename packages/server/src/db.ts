import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as pgSchema from "./schema";
import * as sqliteSchema from "@eat/shared/schema";

/**
 * Database connection — auto-selects adapter:
 *   DATABASE_URL set  → Neon serverless PostgreSQL (Railway production)
 *   DATABASE_URL unset → better-sqlite3 (local development)
 *
 * Typed as NeonHttpDatabase<pgSchema> so all 68 server routes get full
 * TypeScript validation against the production schema. The SQLite branch is
 * dev-only and cast to match — Railway always sets DATABASE_URL in prod.
 */
export const db: NeonHttpDatabase<typeof pgSchema> = process.env.DATABASE_URL
  ? drizzleNeon(neon(process.env.DATABASE_URL), { schema: pgSchema })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : drizzleSqlite(new Database(process.env.DATABASE_PATH || "./db.sqlite"), { schema: sqliteSchema }) as any;

export type DB = typeof db;
