# Agora Service - Quick Start Guide

## 1. Setup (One-time)

```bash
# 1. Add to .env
echo "AGORA_APP_ID=your_app_id" >> .env
echo "AGORA_APP_CERTIFICATE=your_certificate" >> .env

# 2. Restart server
npm run dev
```

## 2. Import Service

```typescript
import { agoraService } from "../../services/video/AgoraService";
```

## 3. Common Operations

### Start a 1-on-1 Call
```typescript
const call = await agoraService.createChannel({
  hostUserId: req.userId,
  callType: "one_on_one",
  participantUserIds: [req.body.recipientId]
});

res.json({
  callId: call.callId,
  token: call.token,
  channelName: call.channelName
});
```

### Start a Group Call
```typescript
const call = await agoraService.createChannel({
  hostUserId: req.userId,
  callType: "group",
  participantUserIds: [user1, user2, user3]
});
```

### Join an Existing Call
```typescript
const token = await agoraService.joinChannel(
  req.body.channelName,
  req.userId
);

res.json({ token });
```

### Update User Media Status
```typescript
await agoraService.updateParticipantMedia(
  callId,
  userId,
  true,  // isMuted
  false  // isVideoOn
);
```

### End a Call
```typescript
const result = await agoraService.endCall({
  callId: req.body.callId,
  recordingUrl: req.body.recordingUrl // optional
});

res.json({
  success: true,
  duration: result.duration
});
```

## 4. Error Handling

All methods throw errors - use try/catch:

```typescript
try {
  const call = await agoraService.createChannel({...});
  res.json(call);
} catch (error) {
  res.status(400).json({
    error: error.message
  });
}
```

## 5. Database Queries

```typescript
// Get call details
const details = await agoraService.getCallDetails(callId);
console.log(details.call);      // Call metadata
console.log(details.participants); // Participant list

// Mark user as left
await agoraService.markParticipantLeft(callId, userId);
```

## 6. API Endpoint Template

```typescript
// POST /api/v1/video/call/create
router.post("/video/call/create", authenticateToken, async (req, res) => {
  try {
    const { recipientId, type } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: "Recipient ID required" });
    }

    const call = await agoraService.createChannel({
      hostUserId: req.userId,
      callType: type || "one_on_one",
      participantUserIds: [recipientId]
    });

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error("Failed to create call:", error);
    res.status(400).json({ error: error.message });
  }
});
```

## 7. Token Format

Every token response includes:
```typescript
{
  token: string;           // Agora token (use on client)
  channelName: string;     // Channel to join
  appId: string;           // Agora App ID
  uid: string;             // User's numeric ID in channel
  expiresIn: 86400;        // Seconds until expiration (24h)
}
```

## 8. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Agora credentials not configured" | Missing env vars | Add AGORA_APP_ID & AGORA_APP_CERTIFICATE |
| "User not found" | Invalid userId | Verify user exists in DB |
| "Video call not found" | Invalid callId | Check callId is correct |
| Token validation fails on client | Token expired | Token expires after 24 hours |

## 9. Complete Endpoint Example

```typescript
import { agoraService } from "../../services/video/AgoraService";

// Create call
router.post("/api/v1/video/call", authenticateToken, async (req, res) => {
  try {
    const call = await agoraService.createChannel({
      hostUserId: req.userId,
      callType: "one_on_one",
      participantUserIds: [req.body.recipientId]
    });

    res.json(call);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Join call
router.post("/api/v1/video/join", authenticateToken, async (req, res) => {
  try {
    const token = await agoraService.joinChannel(
      req.body.channelName,
      req.userId
    );

    res.json(token);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// End call
router.post("/api/v1/video/end", authenticateToken, async (req, res) => {
  try {
    const result = await agoraService.endCall({
      callId: req.body.callId
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update media
router.post("/api/v1/video/media", authenticateToken, async (req, res) => {
  try {
    await agoraService.updateParticipantMedia(
      req.body.callId,
      req.userId,
      req.body.isMuted,
      req.body.isVideoOn
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## 10. Client-Side Usage (React Native Example)

```typescript
import AgoraUIKit from 'agora-react-native-uikit';

// Get token from your API
const response = await fetch('/api/v1/video/call', {
  method: 'POST',
  body: JSON.stringify({ recipientId })
});
const { token, channelName, appId } = await response.json();

// Use in component
<AgoraUIKit
  connectionData={{
    appId,
    channel: channelName,
    token,
    uid: Math.random() * 10000 // Will be converted to int
  }}
/>
```

## Reference

- Full docs: `./README.md`
- Setup guide: `../../AGORA_IMPLEMENTATION.md`
- Service file: `./AgoraService.ts`
