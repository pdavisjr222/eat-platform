# MessageService Quick Start

Get Socket.IO messaging running in 5 minutes.

## Step 1: Install Dependencies

```bash
cd packages/server
npm install socket.io
```

## Step 2: Update Server (src/index.ts)

Replace your server initialization with:

```typescript
import express from "express";
import { createServer } from "http";
import { messageService } from "./services/messaging";

const app = express();
app.use(express.json());

// Your routes here
// app.use("/api/v1", routes);

// Create HTTP server (important!)
const httpServer = createServer(app);

// Initialize Socket.IO
messageService.setupWebSocket(httpServer);

// Use httpServer.listen() instead of app.listen()
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
```

## Step 3: Test with Client

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Socket.IO Test</title>
  <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Socket.IO Messaging Test</h1>
  <div id="status">Connecting...</div>
  <input id="recipientId" placeholder="Recipient User ID" />
  <input id="message" placeholder="Message" />
  <button onclick="sendMessage()">Send</button>
  <div id="messages"></div>

  <script>
    // Get your JWT token (from login)
    const token = "YOUR_JWT_TOKEN_HERE";

    // Connect to Socket.IO
    const socket = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      document.getElementById("status").textContent = "✓ Connected";
      document.getElementById("status").style.color = "green";
    });

    socket.on("disconnect", () => {
      document.getElementById("status").textContent = "✗ Disconnected";
      document.getElementById("status").style.color = "red";
    });

    socket.on("message:new", (message) => {
      const div = document.createElement("div");
      div.textContent = `New: ${message.content}`;
      document.getElementById("messages").appendChild(div);
    });

    socket.on("message:sent", (message) => {
      const div = document.createElement("div");
      div.textContent = `Sent: ${message.content}`;
      div.style.color = "blue";
      document.getElementById("messages").appendChild(div);
    });

    socket.on("error", (error) => {
      const div = document.createElement("div");
      div.textContent = `Error: ${error.message}`;
      div.style.color = "red";
      document.getElementById("messages").appendChild(div);
    });

    function sendMessage() {
      const recipientId = document.getElementById("recipientId").value;
      const content = document.getElementById("message").value;

      if (!recipientId || !content) {
        alert("Fill in both fields");
        return;
      }

      socket.emit("message:send", {
        recipientUserId: recipientId,
        content: content,
        messageType: "text"
      });

      document.getElementById("message").value = "";
    }
  </script>
</body>
</html>
```

## Step 4: Run & Test

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Open test file in browser**

3. **Get a JWT token** (from your login endpoint)

4. **Replace `YOUR_JWT_TOKEN_HERE` in the HTML**

5. **Enter a recipient user ID** (must exist in database)

6. **Send a message**

## Step 5: Test with Two Browsers

1. Open the HTML file in two browsers
2. Use different JWT tokens (two different users)
3. Enter each other's user IDs
4. Send messages back and forth
5. Watch real-time delivery!

## Common Issues

### "Authentication required"
- Check your JWT token is valid
- Make sure token is not expired
- Verify JWT_SECRET in .env matches

### "Recipient not found"
- Check user exists in database
- User must have `isActive = true`
- Use correct user ID (not email)

### Connection fails
- Verify server is running
- Check CORS settings if cross-origin
- Try changing transport to polling only:
  ```javascript
  const socket = io("http://localhost:3000", {
    auth: { token },
    transports: ["polling"] // Try polling first
  });
  ```

## Next Steps

1. Read **README.md** for full documentation
2. Check **INTEGRATION.md** for production setup
3. See **MessageService.example.ts** for code examples
4. Implement in your React Native app

## React Native Quick Test

```typescript
import { useEffect, useState } from "react";
import io from "socket.io-client";

export function TestMessaging({ authToken, recipientUserId }) {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      auth: { token: authToken },
      transports: ["websocket", "polling"]
    });

    newSocket.on("connect", () => {
      console.log("✓ Connected");
    });

    newSocket.on("message:new", (msg) => {
      console.log("New message:", msg.content);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [authToken]);

  const sendMessage = () => {
    if (!socket || !message) return;

    socket.emit("message:send", {
      recipientUserId,
      content: message,
      messageType: "text"
    });

    setMessage("");
  };

  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type message..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
}
```

## Production Checklist

- [ ] Set production CORS origins in `.env`
- [ ] Enable rate limiting
- [ ] Set up Redis adapter for multi-server
- [ ] Configure Firebase for push notifications
- [ ] Add monitoring/logging
- [ ] Test with expected concurrent users
- [ ] Set up SSL/TLS for WSS

## Help

- **Documentation:** README.md
- **Integration:** INTEGRATION.md
- **Examples:** MessageService.example.ts
- **Summary:** SUMMARY.md

That's it! You now have real-time messaging working. 🎉
