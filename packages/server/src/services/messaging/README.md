# MessageService Documentation

Real-time messaging service using Socket.IO for the E.A.T. Platform.

## Features

- **JWT Authentication**: Secure WebSocket connections using JWT tokens
- **User Rooms**: Automatic user room management for targeted message delivery
- **Real-time Events**:
  - `message:send` - Send messages
  - `message:read` - Mark messages as read
  - `message:typing` - Typing indicators
  - `message:new` - Receive new messages
  - `typing:start` / `typing:stop` - Typing status updates
- **Offline Support**: Push notifications when recipient is offline
- **Online Status**: Track and query user online status
- **Database Integration**: Messages stored in `chatMessages` table
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Architecture

```
Client (React Native/Web)
  ↓ WebSocket (Socket.IO)
MessageService
  ↓ Database (chatMessages table)
  ↓ Push Notifications (if offline)
  ↓ Real-time events to connected clients
```

## Setup

### 1. Initialize in Server

```typescript
// src/index.ts
import { createServer } from "http";
import express from "express";
import { messageService } from "./services/messaging";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
messageService.setupWebSocket(httpServer);

httpServer.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### 2. Client Connection (React Native)

```typescript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: yourJWTToken,
  },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected to server");
});
```

## Socket Events

### Client → Server

#### `message:send`
Send a new message to another user.

**Payload:**
```typescript
{
  recipientUserId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  attachmentUrl?: string;
}
```

**Response Events:**
- `message:sent` - Confirmation to sender
- `message:new` - Delivered to recipient (if online)
- `error` - If something went wrong

#### `message:read`
Mark a message as read.

**Payload:**
```typescript
{
  messageId: string;
}
```

**Response Events:**
- `message:read` - Sent to original sender

#### `message:typing`
Notify recipient that you're typing.

**Payload:**
```typescript
{
  recipientUserId: string;
}
```

**Response Events:**
- `typing:start` - Delivered to recipient

#### `message:stop-typing`
Notify recipient that you stopped typing.

**Payload:**
```typescript
{
  recipientUserId: string;
}
```

**Response Events:**
- `typing:stop` - Delivered to recipient

### Server → Client

#### `message:new`
Receive a new message.

**Payload:**
```typescript
{
  id: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  messageType: "text" | "image" | "file";
  attachmentUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}
```

#### `message:sent`
Confirmation that your message was sent successfully.

**Payload:** Same as `message:new`

#### `message:read`
Notification that your message was read.

**Payload:**
```typescript
{
  messageId: string;
  readAt: Date;
}
```

#### `typing:start`
User started typing.

**Payload:**
```typescript
{
  userId: string;
}
```

#### `typing:stop`
User stopped typing.

**Payload:**
```typescript
{
  userId: string;
}
```

#### `error`
Error occurred during an operation.

**Payload:**
```typescript
{
  message: string;
  details?: string;
}
```

## API Methods

### `setupWebSocket(server: HTTPServer): SocketIOServer`
Initialize Socket.IO server with authentication and event handlers.

### `sendMessage(senderUserId, recipientUserId, content, messageType?, attachmentUrl?): Promise<ChatMessage>`
Send a message programmatically (for REST API or background jobs).

### `markAsRead(messageId, userId): Promise<ChatMessage>`
Mark a message as read programmatically.

### `notifyTyping(senderUserId, recipientUserId, isTyping): void`
Send typing indicator programmatically.

### `isUserOnline(userId): boolean`
Check if a user is currently online.

### `getOnlineUsers(): string[]`
Get list of all online user IDs.

### `getIO(): SocketIOServer | null`
Get Socket.IO instance for advanced usage.

## Database Schema

Messages are stored in the `chatMessages` table:

```typescript
{
  id: string;
  senderUserId: string;
  recipientUserId: string;
  messageType: "text" | "image" | "file";
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  // ... sync metadata fields
}
```

## Push Notifications

When a recipient is offline, a push notification is automatically sent using the NotificationService.

**Requirements:**
- Recipient must have registered device with FCM token in `deviceRegistry` table
- NotificationService must be properly configured with Firebase credentials

**Notification format:**
```typescript
{
  title: "New message from [Sender Name]",
  body: "[Message content]" (truncated to 100 chars),
  data: {
    type: "message",
    senderId: string,
    timestamp: string
  }
}
```

## Error Handling

All socket events follow this error handling pattern:

```typescript
try {
  // Validate input
  if (!input) {
    socket.emit("error", { message: "Validation failed" });
    return;
  }

  // Perform operation
  const result = await operation();

  // Emit success event
  socket.emit("success:event", result);
} catch (error) {
  console.error("Operation failed:", error);
  socket.emit("error", {
    message: "User-friendly error message",
    details: error.message
  });
}
```

## Security

- **Authentication**: All connections require valid JWT token
- **Authorization**: Users can only send messages on their own behalf
- **Validation**: All inputs are validated before processing
- **Rate Limiting**: Implement rate limiting middleware in production
- **Sanitization**: Message content should be sanitized before rendering in UI

## Best Practices

### Client-Side

1. **Reconnection**: Handle disconnections gracefully
```typescript
socket.on("disconnect", () => {
  console.log("Disconnected, will auto-reconnect");
});

socket.on("reconnect", () => {
  console.log("Reconnected successfully");
});
```

2. **Typing Indicators**: Debounce typing events
```typescript
import { debounce } from "lodash";

const sendTyping = debounce(() => {
  socket.emit("message:typing", { recipientUserId });
}, 300);

const sendStopTyping = debounce(() => {
  socket.emit("message:stop-typing", { recipientUserId });
}, 1000);
```

3. **Message Queue**: Queue messages when offline, send when reconnected

4. **Cleanup**: Always disconnect socket when component unmounts
```typescript
useEffect(() => {
  return () => {
    socket.disconnect();
  };
}, []);
```

### Server-Side

1. **Monitoring**: Log all socket connections and errors
2. **Memory Management**: Track online users and clean up on disconnect
3. **Scaling**: Use Redis adapter for multi-server deployments
4. **Testing**: Test with multiple concurrent connections

## Troubleshooting

### Connection Fails
- Verify JWT token is valid and not expired
- Check CORS configuration matches client origin
- Ensure Socket.IO server is initialized before client connects

### Messages Not Received
- Verify recipient is online using `isUserOnline()`
- Check recipient's user room: `user:${userId}`
- Verify database insert was successful

### Push Notifications Not Sent
- Check if recipient has FCM token in `deviceRegistry`
- Verify NotificationService is configured
- Check Firebase console for delivery errors

### High Memory Usage
- Monitor `onlineUsers` Map size
- Implement cleanup for stale connections
- Use Redis adapter for distributed deployments

## Examples

See `MessageService.example.ts` for comprehensive usage examples including:
- Server initialization
- REST API integration
- Client-side React Native component
- Error handling patterns
- Advanced use cases

## Testing

```typescript
// Test connection
const socket = io("http://localhost:3000", {
  auth: { token: testToken }
});

socket.on("connect", () => {
  console.log("✓ Connection successful");
});

// Test sending message
socket.emit("message:send", {
  recipientUserId: "test-recipient",
  content: "Test message"
});

socket.on("message:sent", (message) => {
  console.log("✓ Message sent:", message.id);
});

socket.on("error", (error) => {
  console.error("✗ Error:", error);
});
```

## Performance Considerations

- **Connection Pooling**: Limit max connections per user
- **Message Batching**: Batch read receipts for better performance
- **Caching**: Cache user online status in Redis
- **Compression**: Enable Socket.IO compression for large messages
- **Load Balancing**: Use sticky sessions or Redis adapter

## Future Enhancements

- [ ] Group messaging support
- [ ] Message delivery receipts (sent, delivered, read)
- [ ] Message reactions and replies
- [ ] Voice/video message attachments
- [ ] End-to-end encryption
- [ ] Message search and pagination
- [ ] Presence status (online, away, busy, offline)
- [ ] Message editing and deletion
- [ ] Spam detection and rate limiting
- [ ] Message translation

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [JWT Authentication](https://jwt.io/introduction)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
