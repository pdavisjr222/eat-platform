import { defineConfig } from "drizzle-kit";

// SQLite-based local development database.
// This creates/uses a file called "db.sqlite" in the project root.
export default defineConfig({
  out: "./migrations",
  schema: "../shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    // For SQLite, this is just the file name / path.
    url: "./db.sqlite",
  },
});
