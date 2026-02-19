import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@eat/shared/schema";

// Single SQLite database file in the project root.
// If "db.sqlite" does not exist, it will be created automatically.
const sqlite = new Database("db.sqlite");

// Drizzle ORM instance configured for SQLite + our shared schema.
export const db = drizzle(sqlite, { schema });
