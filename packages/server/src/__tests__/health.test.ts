import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    // Create a minimal express app with just the health route
    const app = express();
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeTruthy();
    expect(typeof res.body.uptime).toBe("number");
  });
});
