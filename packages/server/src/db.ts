import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@eat/shared/schema";

// DATABASE_PATH lets Railway (or any host) point to a persistent volume.
// Falls back to ./db.sqlite for local development.
const dbPath = process.env.DATABASE_PATH || "./db.sqlite";
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
