# Agora Video Service Implementation

## Overview

Created a complete TypeScript wrapper for Agora video calling functionality integrated with the E.A.T. platform database.

## Files Created

1. **`packages/server/src/services/video/AgoraService.ts`** (469 lines)
   - Main service class with 7 core methods
   - Full TypeScript type definitions
   - Comprehensive error handling
   - Database integration

2. **`packages/server/src/services/video/README.md`**
   - Usage examples
   - API documentation
   - Database schema reference

## Configuration Changes

Updated **`packages/server/src/config.ts`** with Agora credentials:
```typescript
// Agora
agoraAppId: process.env.AGORA_APP_ID || "",
agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || "",
```

## Environment Variables Required

```env
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
```

## Core Features

### 1. Token Generation (24-hour expiration)
- `generateToken(params)` - Creates Agora access tokens
- Validates user exists in database
- Converts user IDs to numeric UIDs
- Sets appropriate RTC roles

### 2. Channel Management
- `createChannel(params)` - Initiates video calls
  - Supports 1-on-1 and group calls
  - Creates unique channel names
  - Adds host and participants to database
  - Generates initial token

- `joinChannel(channelName, userId)` - Allows users to join
  - Validates channel exists
  - Creates participant records
  - Generates join token

### 3. Call Control
- `endCall(params)` - Terminates calls
  - Calculates call duration
  - Records optional recording URL
  - Updates all participant left times

### 4. Call Monitoring
- `getCallDetails(callId)` - Retrieves call information
  - Returns call metadata
  - Lists all participants with timestamps

- `markParticipantLeft(callId, userId)` - Tracks departures
- `updateParticipantMedia(callId, userId, isMuted, isVideoOn)` - Tracks media status

## Database Integration

### Tables Used
1. **videoCalls** - Video call sessions
   - Stores call metadata and status
   - Tracks duration and recordings

2. **videoCallParticipants** - Call participants
   - Records join/leave times
   - Tracks media status (mute/video)

3. **users** - User verification
   - Validates users exist and aren't banned

## Error Handling

Every method includes:
- ✓ Input validation (null/empty checks)
- ✓ User existence verification
- ✓ Try/catch blocks with console logging
- ✓ User-friendly error messages
- ✓ Context logging for debugging

Example:
```typescript
try {
  // Validate inputs
  if (!input) throw new Error("Input required");

  // Main logic
  const result = await operation();

  // Log success
  console.log("Operation succeeded", { result });

  return result;
} catch (error) {
  // Log with context
  console.error("Operation failed", { error, input });

  // Return user-friendly error
  throw new Error(error.message || "Operation failed");
}
```

## TypeScript Types

### Input Interfaces
```typescript
interface GenerateTokenParams {
  userId: string;
  channelName: string;
  role?: "publisher" | "subscriber";
}

interface CreateChannelParams {
  hostUserId: string;
  callType: "one_on_one" | "group";
  participantUserIds?: string[];
}

interface EndCallParams {
  callId: string;
  recordingUrl?: string;
}
```

### Output Types
```typescript
interface AgoraTokenResponse {
  token: string;
  channelName: string;
  appId: string;
  uid: string;
  expiresIn: number;
}
```

## Token Security

- **Expiration**: 24 hours (86,400 seconds)
- **Generation**: Server-side only, never client-side
- **UID Conversion**: User IDs converted to numeric format
- **Verification**: All users validated before token creation
- **Role-based**: Supports publisher and subscriber roles

## Integration Example

```typescript
import { agoraService } from "./services/video/AgoraService";

// Route: POST /api/v1/video/call/create
async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.userId; // from auth middleware

    const call = await agoraService.createChannel({
      hostUserId: userId,
      callType: "one_on_one",
      participantUserIds: [participantId]
    });

    res.json({
      callId: call.callId,
      channelName: call.channelName,
      token: call.token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

## Service Export Pattern

The service is exported as a singleton:
```typescript
export const agoraService = new AgoraService();
```

This ensures:
- Single instance across the application
- Consistent error handling
- Centralized credential management
- Easy testing and mocking

## Dependencies

Already included in `packages/server/package.json`:
- `agora-access-token@^2.0.5`
- `drizzle-orm@^0.39.1`
- `better-sqlite3@^12.5.0`

## Testing

### Manual Test
```typescript
// Test token generation
const token = await agoraService.generateToken({
  userId: "test-user-123",
  channelName: "test_channel",
  role: "publisher"
});

console.log(token); // Should have valid token string

// Test channel creation
const call = await agoraService.createChannel({
  hostUserId: "user-1",
  callType: "one_on_one",
  participantUserIds: ["user-2"]
});

console.log(call); // Should have callId, channelName, token
```

### Validation Checklist
- [ ] AGORA_APP_ID and AGORA_APP_CERTIFICATE set in .env
- [ ] Database initialized with videoCalls and videoCallParticipants tables
- [ ] Service imports correctly in routes
- [ ] Tokens generate without errors
- [ ] Channels created with proper database records
- [ ] Participants tracked correctly
- [ ] Error messages are user-friendly

## Troubleshooting

### "Agora credentials not configured"
- Check AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env
- Restart server after updating .env

### "User not found"
- Verify user exists in users table
- Check user is not deleted or banned

### "Video call not found"
- Verify callId is correct
- Check call hasn't been deleted

### Token generation fails
- Ensure valid channelName format
- Verify user exists in database
- Check Agora credentials are valid

## Future Enhancements

- [ ] Implement webhook for Agora call events
- [ ] Add Redis caching for tokens
- [ ] Support for Agora recording service
- [ ] Real-time call quality metrics
- [ ] Participant analytics
- [ ] Call history export
