/**
 * NotificationService - Firebase Cloud Messaging push notification service
 *
 * Features:
 * - Send push notifications to individual devices
 * - Send notifications to all user devices
 * - Batch notifications to multiple devices
 * - Store notifications in database
 * - Automatic retry logic with exponential backoff
 * - Specialized helper methods for common notification types
 */

import admin from "firebase-admin";
import { db } from "../../db";
import { deviceRegistry, notifications } from "../../schema";
import { eq } from "drizzle-orm";

interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

interface NotificationPayload {
  title: string;
  body: string;
}

interface NotificationData {
  [key: string]: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private initialized = false;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initialize(): void {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!projectId || !privateKey || !clientEmail) {
        console.warn(
          "Firebase credentials not configured. Push notifications will be disabled. " +
          "Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables."
        );
        return;
      }

      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
      }

      this.initialized = true;
      console.log("Firebase Cloud Messaging initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK:", error);
      this.initialized = false;
    }
  }

  /**
   * Check if service is ready
   */
  private isReady(): boolean {
    if (!this.initialized) {
      console.warn("NotificationService not initialized. Skipping notification.");
      return false;
    }
    return true;
  }

  /**
   * Send push notification to a specific device with retry logic
   */
  async sendToDevice(
    fcmToken: string,
    notification: NotificationPayload,
    data?: NotificationData,
    retryCount = 0
  ): Promise<SendResult> {
    if (!this.isReady()) {
      return { success: false, error: "Service not initialized" };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
        token: fcmToken,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`Push notification sent successfully: ${response}`);

      return { success: true, messageId: response };
    } catch (error: any) {
      console.error(`Error sending push notification (attempt ${retryCount + 1}):`, error);

      // Handle specific FCM errors
      if (error.code === "messaging/registration-token-not-registered") {
        console.warn(`FCM token invalid or expired: ${fcmToken}`);
        // Remove invalid token from database
        await this.removeInvalidToken(fcmToken);
        return { success: false, error: "Invalid FCM token" };
      }

      // Retry logic with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.sendToDevice(fcmToken, notification, data, retryCount + 1);
      }

      return { success: false, error: error.message || "Failed to send notification" };
    }
  }

  /**
   * Send push notification to all devices registered to a user
   */
  async sendToUser(
    userId: string,
    notification: NotificationPayload,
    data?: NotificationData
  ): Promise<{ sent: number; failed: number }> {
    if (!this.isReady()) {
      return { sent: 0, failed: 0 };
    }

    try {
      // Get all FCM tokens for user
      const devices = await db
        .select({ fcmToken: deviceRegistry.fcmToken })
        .from(deviceRegistry)
        .where(eq(deviceRegistry.userId, userId));

      const tokens = devices
        .map(d => d.fcmToken)
        .filter((token): token is string => token !== null && token !== undefined);

      if (tokens.length === 0) {
        console.log(`No FCM tokens found for user: ${userId}`);
        return { sent: 0, failed: 0 };
      }

      console.log(`Sending notification to ${tokens.length} device(s) for user: ${userId}`);

      // Store notification in database
      await this.storeNotification(userId, notification, data);

      // Send to all tokens
      const results = await this.sendToMultiple(tokens, notification, data);
      return results;
    } catch (error) {
      console.error("Error sending notification to user:", error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Send push notification to multiple devices (batch operation)
   */
  async sendToMultiple(
    fcmTokens: string[],
    notification: NotificationPayload,
    data?: NotificationData
  ): Promise<{ sent: number; failed: number }> {
    if (!this.isReady()) {
      return { sent: 0, failed: 0 };
    }

    if (fcmTokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
        tokens: fcmTokens,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Batch notification results: ${response.successCount} sent, ${response.failureCount} failed`);

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        response.responses.forEach((result, index) => {
          if (!result.success && result.error?.code === "messaging/registration-token-not-registered") {
            this.removeInvalidToken(fcmTokens[index]);
          }
        });
      }

      return { sent: response.successCount, failed: response.failureCount };
    } catch (error: any) {
      console.error("Error sending batch notification:", error);
      return { sent: 0, failed: fcmTokens.length };
    }
  }

  /**
   * Send notification when user receives a new message
   */
  async notifyNewMessage(
    recipientId: string,
    senderId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: `New message from ${senderName}`,
      body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + "..." : messagePreview,
    };

    const data: NotificationData = {
      type: "message",
      senderId,
      timestamp: new Date().toISOString(),
    };

    await this.sendToUser(recipientId, notification, data);
  }

  /**
   * Send event reminder notification
   */
  async notifyEventReminder(
    userId: string,
    eventId: string,
    eventTitle: string,
    startsAt: Date
  ): Promise<void> {
    const timeUntil = this.getTimeUntilString(startsAt);

    const notification: NotificationPayload = {
      title: "Event Reminder",
      body: `"${eventTitle}" starts ${timeUntil}`,
    };

    const data: NotificationData = {
      type: "event_reminder",
      eventId,
      startsAt: startsAt.toISOString(),
    };

    await this.sendToUser(userId, notification, data);
  }

  /**
   * Send notification about new listing in user's area/category of interest
   */
  async notifyNewListing(
    userId: string,
    category: string,
    listingTitle: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: `New ${category} listing`,
      body: listingTitle,
    };

    const data: NotificationData = {
      type: "new_listing",
      category,
      timestamp: new Date().toISOString(),
    };

    await this.sendToUser(userId, notification, data);
  }

  /**
   * Send notification about new event
   */
  async notifyNewEvent(
    userId: string,
    eventTitle: string,
    eventType: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: `New ${eventType} event`,
      body: eventTitle,
    };

    const data: NotificationData = {
      type: "new_event",
      eventType,
      timestamp: new Date().toISOString(),
    };

    await this.sendToUser(userId, notification, data);
  }

  /**
   * Send notification about credit transaction
   */
  async notifyCreditsEarned(
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const notification: NotificationPayload = {
      title: "Credits Earned",
      body: `You earned ${amount} credits: ${reason}`,
    };

    const data: NotificationData = {
      type: "credits",
      amount: amount.toString(),
      timestamp: new Date().toISOString(),
    };

    await this.sendToUser(userId, notification, data);
  }

  /**
   * Store notification in database for in-app display
   */
  private async storeNotification(
    userId: string,
    notification: NotificationPayload,
    data?: NotificationData
  ): Promise<void> {
    try {
      const notificationType = data?.type || "system";
      const link = this.generateNotificationLink(notificationType, data);

      await db.insert(notifications).values({
        userId,
        type: notificationType,
        title: notification.title,
        message: notification.body,
        link,
      });
    } catch (error) {
      console.error("Error storing notification in database:", error);
    }
  }

  /**
   * Remove invalid FCM token from database
   */
  private async removeInvalidToken(fcmToken: string): Promise<void> {
    try {
      await db
        .delete(deviceRegistry)
        .where(eq(deviceRegistry.fcmToken, fcmToken));
      console.log(`Removed invalid FCM token: ${fcmToken}`);
    } catch (error) {
      console.error("Error removing invalid token:", error);
    }
  }

  /**
   * Generate notification deep link based on type
   */
  private generateNotificationLink(type: string, data?: NotificationData): string | null {
    if (!data) return null;

    switch (type) {
      case "message":
        return data.senderId ? `/messages?user=${data.senderId}` : null;
      case "event_reminder":
      case "new_event":
        return data.eventId ? `/events/${data.eventId}` : null;
      case "new_listing":
        return data.category ? `/marketplace?category=${data.category}` : null;
      case "credits":
        return "/profile/credits";
      default:
        return null;
    }
  }

  /**
   * Get human-readable time until string
   */
  private getTimeUntilString(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    return "soon";
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
