# E.A.T. Platform - PWA Setup Guide

## Overview

The E.A.T. (Ecology Agriculture Trade) platform is configured as a Progressive Web App (PWA) with full offline support, installability, and push notifications.

## What's Included

### 1. Manifest File
- **Location:** `/manifest.json`
- **Defines:** App name, icons, colors, display mode, and shortcuts
- **Icons Generated:** 9 sizes (72x72 to 512x512) + maskable variant
- **Screenshots:** 4 variants (mobile and desktop)
- **Shortcuts:** Quick access to New Listing, Messages, Events, and Map

### 2. Service Worker
- **Location:** `/sw.js`
- **Features:**
  - Offline functionality
  - Cache-first strategy for static assets
  - Network-first for API calls
  - Push notification handling
  - Background sync support
  - Automatic cache updates

### 3. HTML Meta Tags
- **Updated:** `index.html`
- **Includes:**
  - PWA capability flags (mobile-web-app-capable, apple-mobile-web-app-capable)
  - Theme color (#22c55e - green)
  - SEO meta tags (OpenGraph, Twitter Card)
  - Canonical URLs
  - DNS prefetching

## Installation Instructions

### Prerequisites
- Modern browser with PWA support (Chrome 39+, Firefox 55+, Safari 15.1+, Edge 79+)

### User Installation Steps

**Desktop (Chrome/Edge):**
1. Visit the app URL
2. Click the "Install" button in the address bar
3. Or: Menu → "Install E.A.T."

**Mobile (iOS 15.1+):**
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

**Mobile (Android):**
1. Open in Chrome/Edge
2. Menu → "Install app"
3. Or swipe up → "Install"

### Developer Testing

```bash
# Run local development server
npm run web

# Test manifest validity
curl http://localhost:5173/manifest.json | jq .

# Test service worker
# Open DevTools → Application → Service Workers
```

## Features

### Offline Support
- Core app assets cached on first visit
- API calls cached with network-first strategy
- Automatic fallback message when offline

### Installability
- Installable on home screen (all platforms)
- Standalone display (no browser UI)
- Custom app name and icons
- Splash screen colors

### Push Notifications
- Backend can send push messages via `/api/v1/notifications/push`
- User prompted for permission on first visit
- Notification data includes URL for deep linking

### App Shortcuts
Users can long-press app icon (Android) or use context menu (iOS) for quick access:
- New Listing → `/app/listings/new`
- Messages → `/app/messages`
- Events → `/app/events`
- Foraging Map → `/app/map`

### Share Target
Users can share content directly to the app:
- Shares images and videos
- Title and text fields
- Recipient selection

## Icon Assets

### Provided Sizes
- 72x72, 96x96, 128x128, 144x144, 152x152
- 192x192 (standard Android)
- 384x384 (high DPI devices)
- 512x512 (splash screens)
- 512x512 maskable (for adaptive icons on Android 8+)

### Replacing Icons
To use your own icons instead of the SVG placeholders:

1. **Generate PNG files** from your design (use online converters or design tools)
2. **Place in** `/packages/web/client/public/`
3. **Update** `manifest.json` to point to your files:
   ```json
   "icons": [
     {
       "src": "/icon-192x192.png",
       "sizes": "192x192",
       "type": "image/png"
     }
   ]
   ```

### Maskable Icons
For Android 8+ adaptive icons:
- Create icon with main content in center
- Safe zone: 45% of icon size from center
- Crop paths around the content
- Update `manifest.json`:
   ```json
   {
     "src": "/icon-512x512-maskable.png",
     "sizes": "512x512",
     "type": "image/png",
     "purpose": "maskable"
   }
   ```

## Screenshots

### Mobile Screenshots (540x720 and 600x800)
Used by installation prompts on mobile devices.

### Desktop Screenshots (1280x720 and 1920x1080)
Displayed in app stores and browser install dialogs.

### Replacing Screenshots
1. Take actual app screenshots at specified dimensions
2. Place in `public/` folder
3. Update `manifest.json` `screenshots` array

## Push Notifications

### Setup
1. Configure Firebase Cloud Messaging (FCM)
2. Store FCM tokens in `deviceRegistry` table
3. Send push via backend API

### Backend Implementation
```typescript
// Example: Send push notification
import { NotificationService } from './services/NotificationService';

await NotificationService.sendToUser(userId, {
  title: 'New Message',
  body: 'You have a new message from John',
  data: {
    url: '/app/messages/john',
    type: 'message'
  }
});
```

### Frontend Subscription
```typescript
// Request permission
const permission = await Notification.requestPermission();

// Get FCM token and send to backend
const token = await messaging.getToken();
await fetch('/api/v1/devices/register', {
  method: 'POST',
  body: JSON.stringify({ fcmToken: token })
});
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Install Prompt | 39+ | 55+ | 15.1+ | 79+ |
| Service Worker | 40+ | 44+ | 11.1+ | 17+ |
| Push Notifications | 50+ | 44+ | 16+ | 17+ |
| Background Sync | 49+ | Not yet | Not yet | 79+ |
| Manifest | 39+ | 110+ | 15.1+ | 79+ |

## Performance Checklist

- [x] Manifest file valid and accessible
- [x] Service worker caching configured
- [x] Icons in all required sizes
- [x] HTTPS enabled (required for PWA)
- [x] Responsive design (mobile and desktop)
- [x] Theme color configured
- [x] Display mode set to 'standalone'
- [x] Meta tags for all platforms

## Deployment

### Steps
1. Ensure HTTPS is enabled on domain
2. Verify `manifest.json` is accessible at root
3. Ensure `sw.js` is in public folder
4. Test with Chrome DevTools PWA audit
5. Submit to Microsoft Store (Windows PWA)
6. Submit to Google Play (Android PWA)

### Verification
```bash
# Check manifest
curl https://eat-platform.com/manifest.json

# Check service worker
curl https://eat-platform.com/sw.js

# Verify HTTPS
openssl s_client -connect eat-platform.com:443
```

## Testing

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Application tab
3. Check:
   - Manifest validity
   - Service worker status
   - Cache storage
   - Application shortcuts

### Lighthouse Audit
1. DevTools → Lighthouse
2. Click "PWA" checkbox
3. Run audit
4. Fix issues to reach 90+ score

### Installation Testing
1. Chrome: Click install icon in address bar
2. Safari: Share → Add to Home Screen
3. Android: Menu → Install app

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `sw.js` is accessible at `/sw.js`
- Ensure HTTPS is enabled
- Clear browser cache and hard refresh

### App Won't Install
- Verify manifest.json is valid JSON
- Check that app has icons and a name
- Ensure start_url is accessible
- Verify manifest.json has `application/manifest+json` MIME type

### Push Notifications Not Working
- Check Firebase/FCM configuration
- Verify device tokens in `deviceRegistry` table
- Check browser notification permissions
- Test on physical device (not simulator)

### Cache Issues
- Service worker cache is persistent
- Clear manually: Application tab → Cache Storage
- Version number in `CACHE_NAME` forces update
- Users won't see updates until new version cached

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Next Steps

1. **Replace placeholder icons** with branded design
2. **Add Firebase FCM setup** for push notifications
3. **Configure backend notifications endpoint**
4. **Test on physical devices** (iOS and Android)
5. **Submit to app stores** (Microsoft Store, Google Play)
6. **Monitor analytics** for PWA metrics
