# Agora Video Service

TypeScript wrapper for Agora video call functionality with database integration.

## Configuration

Add to `.env`:
```
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```

## Usage

```typescript
import { agoraService } from "./video/AgoraService";

// Generate token for user to join a channel
const token = await agoraService.generateToken({
  userId: "user-123",
  channelName: "call_user-123_1234567890",
  role: "publisher"
});

// Create a new video call
const call = await agoraService.createChannel({
  hostUserId: "user-123",
  callType: "one_on_one", // or "group"
  participantUserIds: ["user-456", "user-789"]
});

// Join an existing call
const joinToken = await agoraService.joinChannel(
  "call_user-123_1234567890",
  "user-456"
);

// Get call details and participants
const callInfo = await agoraService.getCallDetails("call-id-123");

// Update participant media status
await agoraService.updateParticipantMedia(
  "call-id-123",
  "user-456",
  true, // isMuted
  false // isVideoOn
);

// Mark participant as left
await agoraService.markParticipantLeft("call-id-123", "user-456");

// End the call
const result = await agoraService.endCall({
  callId: "call-id-123",
  recordingUrl: "https://recording-url.mp4"
});
```

## Methods

### generateToken(params)
Generates a 24-hour Agora access token for a user.

**Parameters:**
- `userId` - User identifier
- `channelName` - Video channel name
- `role?` - "publisher" (default) or "subscriber"

**Returns:**
```typescript
{
  token: string;
  channelName: string;
  appId: string;
  uid: string;
  expiresIn: number; // 86400 seconds
}
```

### createChannel(params)
Creates a new video call channel and inserts into database.

**Parameters:**
- `hostUserId` - User initiating the call
- `callType` - "one_on_one" or "group"
- `participantUserIds?` - Array of user IDs to invite

**Returns:**
```typescript
{
  callId: string;
  channelName: string;
  token: string;
}
```

### endCall(params)
Terminates a video call and updates duration.

**Parameters:**
- `callId` - Video call ID
- `recordingUrl?` - Recording URL if available

**Returns:**
```typescript
{
  callId: string;
  duration: number; // in seconds
}
```

### joinChannel(channelName, userId)
Generates a token for a user to join an existing channel.

**Parameters:**
- `channelName` - Video channel name
- `userId` - User joining

**Returns:** Same as `generateToken()`

### getCallDetails(callId)
Retrieves call information and all participants.

**Returns:**
```typescript
{
  call: VideoCall;
  participants: VideoCallParticipant[];
}
```

### markParticipantLeft(callId, userId)
Records when a participant leaves the call.

### updateParticipantMedia(callId, userId, isMuted, isVideoOn)
Updates participant's audio/video status.

## Database Schema

### videoCalls
```typescript
{
  id: string;
  callType: "one_on_one" | "group";
  hostUserId: string;
  channelName: string;
  agoraToken: string;
  status: "initiated" | "active" | "ended" | "cancelled";
  startedAt: Date;
  endedAt: Date;
  duration: number; // seconds
  recordingUrl: string;
}
```

### videoCallParticipants
```typescript
{
  id: string;
  callId: string;
  userId: string;
  joinedAt: Date;
  leftAt: Date;
  isMuted: boolean;
  isVideoOn: boolean;
}
```

## Error Handling

All methods throw errors with descriptive messages:
- Input validation errors
- User not found
- Call not found
- Database operation failures

Errors are logged to console with context for debugging.

## Token Security

- Tokens expire after 24 hours
- Each user gets a unique numeric UID derived from their ID
- Tokens are generated server-side, never client-side
- Invalid channels and users are verified before token generation
