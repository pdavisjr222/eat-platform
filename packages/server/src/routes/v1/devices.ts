/**
 * Device Registration Routes - FCM token management
 *
 * Endpoints:
 * - POST /api/v1/devices/register - Register or update device with FCM token
 * - DELETE /api/v1/devices/unregister - Remove device registration
 * - GET /api/v1/devices - Get all registered devices for current user
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { authenticateToken, type AuthRequest } from "../../auth";
import { deviceRegistry } from "@eat/shared/schema";
import { eq, and } from "drizzle-orm";
import type { Response } from "express";

const router = Router();

// Validation schemas
const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  deviceName: z.string().optional(),
  deviceType: z.enum(["ios", "android", "web"]),
  fcmToken: z.string().min(1, "FCM token is required"),
});

const unregisterDeviceSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
});

/**
 * POST /api/v1/devices/register
 * Register or update device with FCM token
 *
 * Creates new device registration or updates existing one if deviceId already exists.
 * This allows the same device to update its FCM token when it changes.
 */
router.post("/register", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validation = registerDeviceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const { deviceId, deviceName, deviceType, fcmToken } = validation.data;
    const userId = req.userId!;

    // Check if device already registered
    const [existingDevice] = await db
      .select()
      .from(deviceRegistry)
      .where(
        and(
          eq(deviceRegistry.userId, userId),
          eq(deviceRegistry.deviceId, deviceId)
        )
      )
      .limit(1);

    if (existingDevice) {
      // Update existing device registration
      const [updatedDevice] = await db
        .update(deviceRegistry)
        .set({
          deviceName: deviceName || existingDevice.deviceName,
          deviceType,
          fcmToken,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deviceRegistry.id, existingDevice.id))
        .returning();

      console.log(`Device updated: ${deviceId} for user ${userId}`);

      return res.json({
        success: true,
        message: "Device updated successfully",
        device: updatedDevice,
      });
    }

    // Create new device registration
    const [newDevice] = await db
      .insert(deviceRegistry)
      .values({
        userId,
        deviceId,
        deviceName: deviceName || `${deviceType} device`,
        deviceType,
        fcmToken,
        lastActiveAt: new Date(),
      })
      .returning();

    console.log(`Device registered: ${deviceId} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      device: newDevice,
    });
  } catch (error: any) {
    console.error("Error registering device:", error);

    // Handle unique constraint violations
    if (error.message?.includes("UNIQUE constraint failed")) {
      return res.status(409).json({
        error: "Device already registered",
        details: "This device ID is already registered. Use a different device ID or unregister first.",
      });
    }

    res.status(500).json({
      error: "Failed to register device",
      details: error.message,
    });
  }
});

/**
 * DELETE /api/v1/devices/unregister
 * Remove device registration
 *
 * Removes device from registry, stopping push notifications to this device.
 * Useful when user logs out or uninstalls app.
 */
router.delete("/unregister", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validation = unregisterDeviceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const { deviceId } = validation.data;
    const userId = req.userId!;

    // Find device to unregister
    const [device] = await db
      .select()
      .from(deviceRegistry)
      .where(
        and(
          eq(deviceRegistry.userId, userId),
          eq(deviceRegistry.deviceId, deviceId)
        )
      )
      .limit(1);

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
        details: "No device registered with this device ID for current user.",
      });
    }

    // Delete device registration
    await db
      .delete(deviceRegistry)
      .where(eq(deviceRegistry.id, device.id));

    console.log(`Device unregistered: ${deviceId} for user ${userId}`);

    res.json({
      success: true,
      message: "Device unregistered successfully",
    });
  } catch (error: any) {
    console.error("Error unregistering device:", error);
    res.status(500).json({
      error: "Failed to unregister device",
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/devices
 * Get all registered devices for current user
 *
 * Returns list of all devices where user is currently logged in.
 * Useful for account security and device management.
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const devices = await db
      .select({
        id: deviceRegistry.id,
        deviceId: deviceRegistry.deviceId,
        deviceName: deviceRegistry.deviceName,
        deviceType: deviceRegistry.deviceType,
        lastActiveAt: deviceRegistry.lastActiveAt,
        createdAt: deviceRegistry.createdAt,
      })
      .from(deviceRegistry)
      .where(eq(deviceRegistry.userId, userId))
      .orderBy(deviceRegistry.lastActiveAt);

    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error: any) {
    console.error("Error fetching devices:", error);
    res.status(500).json({
      error: "Failed to fetch devices",
      details: error.message,
    });
  }
});

/**
 * PUT /api/v1/devices/active
 * Update device last active timestamp
 *
 * Called periodically by client to maintain device activity status.
 * Helps identify inactive devices for cleanup.
 */
router.put("/active", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    const userId = req.userId!;

    const [device] = await db
      .select()
      .from(deviceRegistry)
      .where(
        and(
          eq(deviceRegistry.userId, userId),
          eq(deviceRegistry.deviceId, deviceId)
        )
      )
      .limit(1);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    await db
      .update(deviceRegistry)
      .set({
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deviceRegistry.id, device.id));

    res.json({
      success: true,
      message: "Device activity updated",
    });
  } catch (error: any) {
    console.error("Error updating device activity:", error);
    res.status(500).json({
      error: "Failed to update device activity",
      details: error.message,
    });
  }
});

export default router;
