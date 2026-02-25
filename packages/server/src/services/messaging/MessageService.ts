import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { verifyToken } from "../../auth";
import { db } from "../../db";
import { chatMessages, users, deviceRegistry } from "../../schema";
import { eq, and, or, desc } from "drizzle-orm";
import type { InsertChatMessage, ChatMessage } from "../../schema";

// Types
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface SendMessagePayload {
  recipientUserId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  attachmentUrl?: string;
}

interface MarkAsReadPayload {
  messageId: string;
}

interface TypingPayload {
  recipientUserId: string;
}

interface SocketUser {
  socketId: string;
  userId: string;
}

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

export class MessageService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize Socket.IO server with CORS and authentication
   */
  setupWebSocket(server: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === "production"
          ? [process.env.DOMAIN || "", process.env.APP_URL || ""]
          : true, // Allow all origins in development
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("Authentication required"));
        }

        const payload = verifyToken(token);
        if (!payload) {
          return next(new Error("Invalid or expired token"));
        }

        // Attach userId to socket
        socket.userId = payload.userId;
        next();
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });

    // Connection handler
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log("Socket.IO server initialized");
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${userId}, socket: ${socket.id}`);

    // Track online user
    onlineUsers.set(userId, socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit online status to friends/contacts
    this.broadcastUserStatus(userId, "online");

    // Event handlers
    socket.on("message:send", (payload: SendMessagePayload) => {
      this.handleSendMessage(socket, payload);
    });

    socket.on("message:read", (payload: MarkAsReadPayload) => {
      this.handleMarkAsRead(socket, payload);
    });

    socket.on("message:typing", (payload: TypingPayload) => {
      this.handleTyping(socket, payload, true);
    });

    socket.on("message:stop-typing", (payload: TypingPayload) => {
      this.handleTyping(socket, payload, false);
    });

    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(
    socket: AuthenticatedSocket,
    payload: SendMessagePayload
  ): Promise<void> {
    try {
      const senderId = socket.userId;
      if (!senderId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Validate payload
      if (!payload.recipientUserId || !payload.content?.trim()) {
        socket.emit("error", { message: "Invalid message payload" });
        return;
      }

      // Check if recipient exists
      const [recipient] = await db
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, payload.recipientUserId))
        .limit(1);

      if (!recipient) {
        socket.emit("error", { message: "Recipient not found" });
        return;
      }

      if (!recipient.isActive) {
        socket.emit("error", { message: "Recipient account is inactive" });
        return;
      }

      // Store message in database
      const messageData: InsertChatMessage = {
        senderUserId: senderId,
        recipientUserId: payload.recipientUserId,
        content: payload.content.trim(),
        messageType: payload.messageType || "text",
        attachmentUrl: payload.attachmentUrl || null,
      };

      const [newMessage] = await db
        .insert(chatMessages)
        .values(messageData)
        .returning();

      if (!newMessage) {
        throw new Error("Failed to create message");
      }

      // Emit message to sender (confirmation)
      socket.emit("message:sent", newMessage);

      // Emit message to recipient if online
      const recipientSocketId = onlineUsers.get(payload.recipientUserId);
      if (recipientSocketId) {
        this.io?.to(`user:${payload.recipientUserId}`).emit("message:new", newMessage);
      } else {
        // Recipient is offline, send push notification
        await this.sendPushNotification(payload.recipientUserId, senderId, payload.content);
      }

      console.log(`Message sent from ${senderId} to ${payload.recipientUserId}`);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", {
        message: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle marking message as read
   */
  private async handleMarkAsRead(
    socket: AuthenticatedSocket,
    payload: MarkAsReadPayload
  ): Promise<void> {
    try {
      const userId = socket.userId;
      if (!userId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      if (!payload.messageId) {
        socket.emit("error", { message: "Message ID required" });
        return;
      }

      // Verify message belongs to user and mark as read
      const [message] = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.id, payload.messageId),
            eq(chatMessages.recipientUserId, userId)
          )
        )
        .limit(1);

      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      if (message.isRead) {
        // Already read, nothing to do
        return;
      }

      // Update message as read
      const [updatedMessage] = await db
        .update(chatMessages)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(chatMessages.id, payload.messageId))
        .returning();

      // Notify sender that message was read
      this.io?.to(`user:${message.senderUserId}`).emit("message:read", {
        messageId: payload.messageId,
        readAt: updatedMessage.readAt,
      });

      console.log(`Message ${payload.messageId} marked as read by ${userId}`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      socket.emit("error", {
        message: "Failed to mark message as read",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(
    socket: AuthenticatedSocket,
    payload: TypingPayload,
    isTyping: boolean
  ): void {
    try {
      const senderId = socket.userId;
      if (!senderId) {
        return;
      }

      if (!payload.recipientUserId) {
        return;
      }

      // Emit typing status to recipient
      const event = isTyping ? "typing:start" : "typing:stop";
      this.io?.to(`user:${payload.recipientUserId}`).emit(event, {
        userId: senderId,
      });

      // Auto-stop typing indicator after 5 seconds
      if (isTyping) {
        const typingKey = `typing:${senderId}:${payload.recipientUserId}`;
        if ((socket as any)._typingTimers?.[typingKey]) {
          clearTimeout((socket as any)._typingTimers[typingKey]);
        }
        if (!(socket as any)._typingTimers) (socket as any)._typingTimers = {};
        (socket as any)._typingTimers[typingKey] = setTimeout(() => {
          const recipientRoom = `user:${payload.recipientUserId}`;
          socket.to(recipientRoom).emit("typing:stop", { userId: senderId });
          delete (socket as any)._typingTimers[typingKey];
        }, 5000);
      }
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    const userId = socket.userId;
    if (!userId) {
      return;
    }

    console.log(`User disconnected: ${userId}, socket: ${socket.id}`);

    // Remove from online users
    onlineUsers.delete(userId);

    // Broadcast offline status
    this.broadcastUserStatus(userId, "offline");
  }

  /**
   * Broadcast user online/offline status
   */
  private broadcastUserStatus(userId: string, status: "online" | "offline"): void {
    try {
      // In a real implementation, you would only broadcast to user's contacts/friends
      // For now, we'll skip this to avoid spamming all clients
      // You can implement contact list fetching and targeted broadcasting here
      console.log(`User ${userId} is now ${status}`);
    } catch (error) {
      console.error("Error broadcasting user status:", error);
    }
  }

  /**
   * Send push notification to offline user
   */
  private async sendPushNotification(
    recipientUserId: string,
    senderId: string,
    messageContent: string
  ): Promise<void> {
    try {
      // Get sender info
      const [sender] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1);

      if (!sender) {
        return;
      }

      // Get recipient's device tokens
      const devices = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.userId, recipientUserId));

      if (devices.length === 0) {
        console.log(`No devices found for user ${recipientUserId}`);
        return;
      }

      // Import NotificationService dynamically to avoid circular dependencies
      const { NotificationService } = await import("../notifications/NotificationService");
      const notificationService = new NotificationService();

      // Send notification to all user's devices
      for (const device of devices) {
        if (device.fcmToken) {
          await notificationService.sendToDevice(device.fcmToken, {
            title: `New message from ${sender.name}`,
            body: messageContent.length > 100
              ? `${messageContent.substring(0, 100)}...`
              : messageContent,
          }, {
            type: "message",
            senderId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      console.log(`Push notification sent to user ${recipientUserId}`);
    } catch (error) {
      console.error("Error sending push notification:", error);
      // Don't throw - push notification failure shouldn't break message sending
    }
  }

  /**
   * Public method to send message programmatically
   */
  async sendMessage(
    senderUserId: string,
    recipientUserId: string,
    content: string,
    messageType: "text" | "image" | "file" = "text",
    attachmentUrl?: string
  ): Promise<ChatMessage> {
    try {
      // Validate users exist
      const [sender, recipient] = await Promise.all([
        db.select({ id: users.id }).from(users).where(eq(users.id, senderUserId)).limit(1),
        db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, recipientUserId)).limit(1),
      ]);

      if (!sender[0]) {
        throw new Error("Sender not found");
      }

      if (!recipient[0]) {
        throw new Error("Recipient not found");
      }

      if (!recipient[0].isActive) {
        throw new Error("Recipient account is inactive");
      }

      // Store message
      const messageData: InsertChatMessage = {
        senderUserId,
        recipientUserId,
        content: content.trim(),
        messageType,
        attachmentUrl: attachmentUrl || null,
      };

      const [newMessage] = await db
        .insert(chatMessages)
        .values(messageData)
        .returning();

      if (!newMessage) {
        throw new Error("Failed to create message");
      }

      // Emit to recipient if online
      const recipientSocketId = onlineUsers.get(recipientUserId);
      if (recipientSocketId) {
        this.io?.to(`user:${recipientUserId}`).emit("message:new", newMessage);
      } else {
        // Send push notification
        await this.sendPushNotification(recipientUserId, senderUserId, content);
      }

      return newMessage;
    } catch (error) {
      console.error("Error in sendMessage:", error);
      throw error;
    }
  }

  /**
   * Public method to mark message as read programmatically
   */
  async markAsRead(messageId: string, userId: string): Promise<ChatMessage> {
    try {
      // Verify message belongs to user
      const [message] = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.id, messageId),
            eq(chatMessages.recipientUserId, userId)
          )
        )
        .limit(1);

      if (!message) {
        throw new Error("Message not found");
      }

      // Update if not already read
      if (!message.isRead) {
        const [updatedMessage] = await db
          .update(chatMessages)
          .set({
            isRead: true,
            readAt: new Date(),
          })
          .where(eq(chatMessages.id, messageId))
          .returning();

        // Notify sender
        this.io?.to(`user:${message.senderUserId}`).emit("message:read", {
          messageId,
          readAt: updatedMessage.readAt,
        });

        return updatedMessage;
      }

      return message;
    } catch (error) {
      console.error("Error in markAsRead:", error);
      throw error;
    }
  }

  /**
   * Public method to notify typing status programmatically
   */
  notifyTyping(senderUserId: string, recipientUserId: string, isTyping: boolean): void {
    try {
      if (!this.io) {
        console.warn("Socket.IO not initialized");
        return;
      }

      const event = isTyping ? "typing:start" : "typing:stop";
      this.io.to(`user:${recipientUserId}`).emit(event, {
        userId: senderUserId,
      });
    } catch (error) {
      console.error("Error in notifyTyping:", error);
    }
  }

  /**
   * Get online status of a user
   */
  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(onlineUsers.keys());
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const messageService = new MessageService();
