/**
 * MessageService Usage Examples
 *
 * This file demonstrates how to use the MessageService in your application.
 */

import type { Express } from "express";
import type { Server as HTTPServer } from "http";
import { messageService } from "./MessageService";

/**
 * Example 1: Initialize Socket.IO server
 *
 * Call this in your main server file (index.ts)
 */
export function initializeWebSocket(httpServer: HTTPServer): void {
  const io = messageService.setupWebSocket(httpServer);
  console.log("WebSocket server initialized");
}

/**
 * Example 2: Send message programmatically (e.g., from REST API)
 *
 * Use this in your API routes when you need to send messages outside of Socket.IO
 */
export async function exampleSendMessage() {
  try {
    const message = await messageService.sendMessage(
      "sender-user-id",
      "recipient-user-id",
      "Hello! This is a test message",
      "text"
    );
    console.log("Message sent:", message.id);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

/**
 * Example 3: Send message with attachment
 */
export async function exampleSendImageMessage() {
  try {
    const message = await messageService.sendMessage(
      "sender-user-id",
      "recipient-user-id",
      "Check out this image!",
      "image",
      "https://example.com/images/photo.jpg"
    );
    console.log("Image message sent:", message.id);
  } catch (error) {
    console.error("Failed to send image:", error);
  }
}

/**
 * Example 4: Mark message as read
 */
export async function exampleMarkAsRead() {
  try {
    const message = await messageService.markAsRead(
      "message-id",
      "recipient-user-id"
    );
    console.log("Message marked as read:", message.readAt);
  } catch (error) {
    console.error("Failed to mark as read:", error);
  }
}

/**
 * Example 5: Check if user is online
 */
export function exampleCheckOnlineStatus() {
  const userId = "some-user-id";
  const isOnline = messageService.isUserOnline(userId);
  console.log(`User ${userId} is ${isOnline ? "online" : "offline"}`);
}

/**
 * Example 6: Get all online users
 */
export function exampleGetOnlineUsers() {
  const onlineUsers = messageService.getOnlineUsers();
  console.log(`${onlineUsers.length} users online:`, onlineUsers);
}

/**
 * Example 7: Send typing notification
 */
export function exampleTypingIndicator() {
  // Start typing
  messageService.notifyTyping("sender-user-id", "recipient-user-id", true);

  // Stop typing after 3 seconds
  setTimeout(() => {
    messageService.notifyTyping("sender-user-id", "recipient-user-id", false);
  }, 3000);
}

/**
 * Example 8: Create REST API endpoint for sending messages
 */
export function setupMessageRoutes(app: Express) {
  // Send message via REST API
  app.post("/api/v1/messages", async (req, res) => {
    try {
      const { recipientUserId, content, messageType, attachmentUrl } = req.body;
      const senderUserId = (req as any).userId; // From auth middleware

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

  // Mark message as read
  app.patch("/api/v1/messages/:messageId/read", async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = (req as any).userId; // From auth middleware

      const message = await messageService.markAsRead(messageId, userId);
      res.json({ success: true, message });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({
        error: "Failed to mark message as read",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Check user online status
  app.get("/api/v1/users/:userId/online", (req, res) => {
    try {
      const { userId } = req.params;
      const isOnline = messageService.isUserOnline(userId);
      res.json({ userId, isOnline });
    } catch (error) {
      console.error("Error checking online status:", error);
      res.status(500).json({ error: "Failed to check online status" });
    }
  });
}

/**
 * CLIENT-SIDE USAGE EXAMPLES
 *
 * These are examples for the frontend (React Native / Web)
 */

/*
// 1. Connect to Socket.IO server
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});

// 2. Listen for connection
socket.on('connect', () => {
  console.log('Connected to server');
});

// 3. Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message received:', message);
  // Update UI with new message
});

// 4. Listen for message read status
socket.on('message:read', (data) => {
  console.log('Message read:', data.messageId, data.readAt);
  // Update UI to show message was read
});

// 5. Listen for typing indicators
socket.on('typing:start', (data) => {
  console.log(`User ${data.userId} is typing...`);
  // Show typing indicator in UI
});

socket.on('typing:stop', (data) => {
  console.log(`User ${data.userId} stopped typing`);
  // Hide typing indicator in UI
});

// 6. Send a message
socket.emit('message:send', {
  recipientUserId: 'recipient-user-id',
  content: 'Hello!',
  messageType: 'text'
});

// 7. Listen for message sent confirmation
socket.on('message:sent', (message) => {
  console.log('Message sent successfully:', message);
  // Update UI to show message was sent
});

// 8. Mark message as read
socket.emit('message:read', {
  messageId: 'message-id'
});

// 9. Send typing indicator
socket.emit('message:typing', {
  recipientUserId: 'recipient-user-id'
});

// Stop typing indicator
socket.emit('message:stop-typing', {
  recipientUserId: 'recipient-user-id'
});

// 10. Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Show error message in UI
});

// 11. Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Update UI to show disconnected status
});

// 12. Reconnect
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Update UI to show connected status
});
*/

/**
 * REACT NATIVE EXAMPLE COMPONENT
 */

/*
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import io from 'socket.io-client';

export function ChatScreen({ recipientUserId, currentUserId, authToken }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io('http://localhost:3000', {
      auth: { token: authToken },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected');
    });

    newSocket.on('message:new', (message) => {
      if (message.senderUserId === recipientUserId) {
        setMessages((prev) => [...prev, message]);
        // Mark as read
        newSocket.emit('message:read', { messageId: message.id });
      }
    });

    newSocket.on('typing:start', (data) => {
      if (data.userId === recipientUserId) {
        setIsTyping(true);
      }
    });

    newSocket.on('typing:stop', (data) => {
      if (data.userId === recipientUserId) {
        setIsTyping(false);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authToken, recipientUserId]);

  const sendMessage = () => {
    if (!socket || !messageText.trim()) return;

    socket.emit('message:send', {
      recipientUserId,
      content: messageText,
      messageType: 'text'
    });

    setMessageText('');
    socket.emit('message:stop-typing', { recipientUserId });
  };

  const handleTextChange = (text) => {
    setMessageText(text);

    if (socket && text.length > 0) {
      socket.emit('message:typing', { recipientUserId });
    } else if (socket) {
      socket.emit('message:stop-typing', { recipientUserId });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View>
            <Text>{item.content}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      {isTyping && <Text>User is typing...</Text>}
      <TextInput
        value={messageText}
        onChangeText={handleTextChange}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
}
*/
