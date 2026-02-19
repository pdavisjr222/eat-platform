# MessageService Integration Guide

Quick guide to integrate MessageService into your Express server.

## Step 1: Update Server Entry Point

Modify `src/index.ts` to initialize Socket.IO:

```typescript
import express from "express";
import { createServer } from "http";
import { messageService } from "./services/messaging";
import { setupRoutes } from "./routes";

const app = express();

// Middleware
app.use(express.json());

// Setup routes
setupRoutes(app);

// Create HTTP server (required for Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO WebSocket server
messageService.setupWebSocket(httpServer);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
```

**Important**: Use `httpServer.listen()` instead of `app.listen()` to support both HTTP and WebSocket.

## Step 2: Add Message Routes (Optional)

Create REST API endpoints in addition to WebSocket events:

```typescript
// src/routes/messages.ts
import { Router } from "express";
import { authenticateToken, type AuthRequest } from "../auth";
import { messageService } from "../services/messaging";
import { db } from "../db";
import { chatMessages, users } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";

const router = Router();

// Get message history between two users
router.get("/messages/:otherUserId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.userId!;
    const { otherUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          and(
            eq(chatMessages.senderUserId, currentUserId),
            eq(chatMessages.recipientUserId, otherUserId)
          ),
          and(
            eq(chatMessages.senderUserId, otherUserId),
            eq(chatMessages.recipientUserId, currentUserId)
          )
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message via REST (alternative to WebSocket)
router.post("/messages", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const senderUserId = req.userId!;
    const { recipientUserId, content, messageType, attachmentUrl } = req.body;

    if (!recipientUserId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await messageService.sendMessage(
      senderUserId,
      recipientUserId,
      content,
      messageType || "text",
      attachmentUrl
    );

    res.json({ success: true, message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      error: "Failed to send message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Mark multiple messages as read
router.patch("/messages/read", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds)) {
      return res.status(400).json({ error: "messageIds must be an array" });
    }

    const results = await Promise.all(
      messageIds.map((id) => messageService.markAsRead(id, userId))
    );

    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Get unread message count
router.get("/messages/unread/count", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.recipientUserId, userId),
          eq(chatMessages.isRead, false)
        )
      );

    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// Get conversation list (recent chats)
router.get("/conversations", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get latest message from each conversation
    const conversations = await db
      .select({
        otherUserId: sql<string>`CASE
          WHEN ${chatMessages.senderUserId} = ${userId} THEN ${chatMessages.recipientUserId}
          ELSE ${chatMessages.senderUserId}
        END`,
        lastMessage: chatMessages.content,
        lastMessageAt: chatMessages.createdAt,
        isRead: chatMessages.isRead,
      })
      .from(chatMessages)
      .where(
        or(
          eq(chatMessages.senderUserId, userId),
          eq(chatMessages.recipientUserId, userId)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    // Get user info for each conversation
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conv) => {
        const [otherUser] = await db
          .select({
            id: users.id,
            name: users.name,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(eq(users.id, conv.otherUserId))
          .limit(1);

        return {
          ...conv,
          otherUser,
          isOnline: messageService.isUserOnline(conv.otherUserId),
        };
      })
    );

    res.json({ conversations: conversationsWithUsers });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Check online status
router.get("/users/:userId/online", authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const isOnline = messageService.isUserOnline(userId);
    res.json({ userId, isOnline });
  } catch (error) {
    console.error("Error checking online status:", error);
    res.status(500).json({ error: "Failed to check online status" });
  }
});

export default router;
```

Then register the routes in your main routes file:

```typescript
// src/routes.ts
import messageRoutes from "./routes/messages";

export function setupRoutes(app: Express) {
  app.use("/api/v1", messageRoutes);
  // ... other routes
}
```

## Step 3: Client Implementation (React Native)

```typescript
// hooks/useMessaging.ts
import { useEffect, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useMessaging() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return;

      const newSocket = io("http://localhost:3000", {
        auth: { token },
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("Connected to messaging server");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from messaging server");
        setIsConnected(false);
      });

      newSocket.on("message:new", (message) => {
        setMessages((prev) => [...prev, message]);
        // Mark as read
        newSocket.emit("message:read", { messageId: message.id });
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (recipientUserId: string, content: string, messageType = "text") => {
      if (!socket || !isConnected) {
        console.error("Socket not connected");
        return;
      }

      socket.emit("message:send", {
        recipientUserId,
        content,
        messageType,
      });
    },
    [socket, isConnected]
  );

  return {
    socket,
    isConnected,
    messages,
    sendMessage,
  };
}
```

## Step 4: Environment Variables

Add to `.env`:

```env
# WebSocket Configuration
WS_CORS_ORIGIN=http://localhost:19006,http://localhost:19000
WS_TRANSPORTS=websocket,polling

# JWT Configuration (should already exist)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## Step 5: Testing

### Test with Postman or Thunder Client

1. **Connect WebSocket:**
   - URL: `ws://localhost:3000`
   - Headers: `Authorization: Bearer YOUR_JWT_TOKEN`

2. **Send Message:**
   ```json
   {
     "event": "message:send",
     "data": {
       "recipientUserId": "recipient-id",
       "content": "Hello!",
       "messageType": "text"
     }
   }
   ```

3. **Listen for Events:**
   - `message:new`
   - `message:sent`
   - `typing:start`
   - `typing:stop`

### Test with REST API

```bash
# Get message history
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/messages/other-user-id

# Send message via REST
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientUserId":"recipient-id","content":"Hello!"}' \
  http://localhost:3000/api/v1/messages

# Check online status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/users/user-id/online
```

## Troubleshooting

### Issue: Socket.IO not initializing

**Solution:** Ensure you're using `createServer(app)` and calling `httpServer.listen()`, not `app.listen()`.

### Issue: CORS errors

**Solution:** Update Socket.IO CORS configuration:
```typescript
cors: {
  origin: ["http://localhost:19006", "http://localhost:19000"],
  credentials: true,
}
```

### Issue: Authentication fails

**Solution:** Verify JWT token is being sent in `socket.handshake.auth.token` or `Authorization` header.

### Issue: Messages not appearing in database

**Solution:** Check database connection and ensure `chatMessages` table exists. Run migrations if needed.

## Next Steps

1. Implement group messaging
2. Add message delivery receipts
3. Implement message reactions
4. Add file upload support
5. Implement message search
6. Add presence status (away, busy)
7. Implement message encryption

## Support

For issues or questions, check:
- `README.md` - Full documentation
- `MessageService.example.ts` - Code examples
- Project issue tracker
