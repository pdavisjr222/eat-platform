# Notification Service

Firebase Cloud Messaging (FCM) push notification service for the E.A.T. platform.

## Features

- Send push notifications to individual devices
- Send notifications to all user devices
- Batch notifications to multiple devices
- Store notifications in database for in-app display
- Automatic retry logic with exponential backoff
- Specialized helper methods for common notification types
- Automatic removal of invalid/expired FCM tokens

## Setup

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Generate new private key (downloads JSON file)

### 2. Environment Variables

Add these to your `.env` file:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Note:** The private key must have actual newlines escaped as `\n` in the environment variable.

### 3. Client Setup (React Native)

Install Firebase SDK in your mobile app:

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

Request permission and get FCM token:

```typescript
import messaging from '@react-native-firebase/messaging';

// Request permission (iOS only)
const authStatus = await messaging().requestPermission();
const enabled =
  authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  authStatus === messaging.AuthorizationStatus.PROVISIONAL;

if (enabled) {
  // Get FCM token
  const fcmToken = await messaging().getToken();

  // Register device with server
  await registerDevice(fcmToken);
}
```

## API Endpoints

### Device Registration

#### POST /api/v1/devices/register

Register or update device with FCM token.

**Request:**
```json
{
  "deviceId": "unique-device-identifier",
  "deviceName": "iPhone 14 Pro",
  "deviceType": "ios",
  "fcmToken": "fcm-token-from-firebase"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "id": "device-uuid",
    "deviceId": "unique-device-identifier",
    "deviceName": "iPhone 14 Pro",
    "deviceType": "ios",
    "fcmToken": "fcm-token-from-firebase",
    "lastActiveAt": "2024-01-15T12:00:00Z",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

#### DELETE /api/v1/devices/unregister

Remove device registration (logout/uninstall).

**Request:**
```json
{
  "deviceId": "unique-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

#### GET /api/v1/devices

Get all registered devices for current user.

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-uuid-1",
      "deviceId": "device-1",
      "deviceName": "iPhone 14 Pro",
      "deviceType": "ios",
      "lastActiveAt": "2024-01-15T12:00:00Z"
    },
    {
      "id": "device-uuid-2",
      "deviceId": "device-2",
      "deviceName": "Samsung Galaxy S23",
      "deviceType": "android",
      "lastActiveAt": "2024-01-14T10:00:00Z"
    }
  ],
  "count": 2
}
```

## Usage in Code

### Import Service

```typescript
import { notificationService } from './services/notifications';
```

### Send to Single Device

```typescript
await notificationService.sendToDevice(
  fcmToken,
  {
    title: "Welcome!",
    body: "Thanks for joining E.A.T. platform"
  },
  {
    type: "welcome",
    userId: "user-123"
  }
);
```

### Send to User (All Devices)

```typescript
await notificationService.sendToUser(
  userId,
  {
    title: "New Message",
    body: "You have a new message from John"
  },
  {
    type: "message",
    senderId: "sender-id"
  }
);
```

### Send to Multiple Devices

```typescript
await notificationService.sendToMultiple(
  [token1, token2, token3],
  {
    title: "Event Starting Soon",
    body: "Your event starts in 30 minutes"
  },
  {
    type: "event_reminder",
    eventId: "event-123"
  }
);
```

### Helper Methods

#### New Message Notification

```typescript
await notificationService.notifyNewMessage(
  recipientUserId,
  senderName,
  messagePreview
);
```

#### Event Reminder

```typescript
await notificationService.notifyEventReminder(
  userId,
  eventTitle,
  startsAt
);
```

#### New Listing

```typescript
await notificationService.notifyNewListing(
  userId,
  category,
  listingTitle
);
```

#### Credits Earned

```typescript
await notificationService.notifyCreditsEarned(
  userId,
  amount,
  reason
);
```

## Notification Types

The service supports these notification types:

- `message` - Chat messages
- `event_reminder` - Event starting soon
- `new_event` - New event posted
- `new_listing` - New marketplace listing
- `credits` - Credits earned/spent
- `system` - System notifications

## Error Handling

The service automatically handles:

- **Invalid tokens:** Removed from database when detected
- **Network errors:** Automatic retry with exponential backoff (3 attempts)
- **Missing config:** Graceful degradation with warnings
- **Batch failures:** Individual failure tracking

## Database Storage

Notifications are stored in two tables:

### `deviceRegistry`
Stores FCM tokens for each user's devices.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | User ID (foreign key) |
| deviceId | String | Unique device identifier |
| deviceName | String | Human-readable device name |
| deviceType | Enum | ios/android/web |
| fcmToken | String | Firebase Cloud Messaging token |
| lastActiveAt | Timestamp | Last activity timestamp |

### `notifications`
Stores notification history for in-app display.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | User ID (foreign key) |
| type | String | Notification type |
| title | String | Notification title |
| message | String | Notification body |
| link | String | Deep link for navigation |
| isRead | Boolean | Read status |
| readAt | Timestamp | Read timestamp |

## Testing

### Test Notification (Development)

```typescript
import { notificationService } from './services/notifications';

// Get test device token from database
const [testDevice] = await db
  .select()
  .from(deviceRegistry)
  .where(eq(deviceRegistry.userId, testUserId))
  .limit(1);

if (testDevice?.fcmToken) {
  await notificationService.sendToDevice(
    testDevice.fcmToken,
    {
      title: "Test Notification",
      body: "This is a test notification"
    },
    {
      type: "test",
      timestamp: new Date().toISOString()
    }
  );
}
```

### Debug Mode

Set `NODE_ENV=development` to see detailed console logs for all notification operations.

## Production Considerations

1. **Rate Limiting:** FCM has rate limits. Consider queueing notifications for large batches.
2. **Token Refresh:** Clients should refresh tokens periodically and update server.
3. **Monitoring:** Track notification success/failure rates.
4. **Privacy:** Never log full notification content in production.
5. **Cleanup:** Periodically remove devices inactive for 90+ days.

## Troubleshooting

### Notifications Not Received

1. Check FCM token is valid: `firebase.messaging().getToken()`
2. Verify device is registered: `GET /api/v1/devices`
3. Check Firebase console for errors
4. Verify app has notification permissions
5. Test with Firebase Console's "Cloud Messaging" test tool

### Invalid Token Errors

- Tokens expire when app is uninstalled or data is cleared
- Service automatically removes invalid tokens
- Client should re-register on token refresh

### Environment Variable Issues

```bash
# Test Firebase initialization
node -e "
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  })
});
console.log('Firebase initialized successfully');
"
```

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [React Native Firebase](https://rnfirebase.io/)
