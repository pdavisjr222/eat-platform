import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as pgSchema from "./schema";
import * as sqliteSchema from "@eat/shared/schema";

/**
 * Database connection — auto-selects adapter:
 *   DATABASE_URL set  → Neon serverless PostgreSQL (Railway production)
 *   DATABASE_URL unset → better-sqlite3 (local development)
 *
 * The db export is typed as `any` to allow both adapters to share the same
 * variable. In practice Railway always sets DATABASE_URL so PG runs in prod.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = process.env.DATABASE_URL
  ? drizzleNeon(neon(process.env.DATABASE_URL), { schema: pgSchema })
  : drizzleSqlite(
      new Database(process.env.DATABASE_PATH || "./db.sqlite"),
      { schema: sqliteSchema }
    );

export type DB = typeof db;
