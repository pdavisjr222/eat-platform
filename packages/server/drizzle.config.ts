import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default process.env.DATABASE_URL
  ? defineConfig({
      out: "./migrations/pg",
      schema: "./src/schema.ts",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL,
      },
    })
  : defineConfig({
      out: "./migrations/sqlite",
      schema: "../shared/schema.ts",
      dialect: "sqlite",
      dbCredentials: {
        url: process.env.DATABASE_PATH || "./db.sqlite",
      },
    });
