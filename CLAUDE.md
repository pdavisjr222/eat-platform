# CLAUDE.md — E.A.T. Platform Development Guide

## Core Directives

**ALWAYS follow these rules in order:**
1. **User input overrides everything** - No exceptions
2. **Smart model selection** - Use Haiku for simple tasks, Sonnet for complex logic
3. **Robust error handling** - Validate, try/catch, log, never fail silently
4. **Token efficiency** - Be concise, avoid repetition, use agents strategically
5. **Keep this file current** - After any session with schema changes, new routes, new services, completed features, or architectural decisions, update this file before closing out

---

## Project Overview

**Name:** E.A.T. (Ecology Agriculture Trade) Platform
**Type:** Hybrid mobile app (React Native + PWA)
**Stack:** Turborepo monorepo, Expo, Express, PostgreSQL, Redis, Socket.IO, Agora SDK
**Scale Target:** 10k+ concurrent users, 1M+ total users
**Domain:** projecteat.org
**Deployed:** api.eat-platform.railway.app (server) | eat-platform.vercel.app (web)

---

## Architecture

```
EcologyAgricultureTrade/
├── packages/
│   ├── mobile/    # React Native (Expo 51) - iOS & Android
│   ├── web/       # Vite + React PWA (shadcn/ui + Tailwind)
│   ├── shared/    # Schema, SyncManager, shared types
│   └── server/    # Express API + Socket.IO + services
├── .github/workflows/  # deploy.yml + test.yml (CI/CD)
└── turbo.json
```

---

## Current Status (Updated: 2026-02-25)

### ✅ Complete
- Turborepo monorepo + 4 packages wired
- Database schema — 31 tables with sync metadata on all
- Full REST API — 68 endpoints split across 14 modular route files (routes/ directory)
- Auth system — JWT (7-day), bcrypt (10 rounds), email verification, password reset
- Real-time messaging — Socket.IO (6 events each direction), typing auto-stop after 5s
- Offline sync — SyncManager, SQLiteStorage (mobile), IndexedDB (web), both initialized on boot
- PWA — service worker, manifest, 9 icon sizes, install prompts, ErrorBoundary
- Redis caching service
- Agora video service (token generation, 1-on-1 & group)
- Vendor referral service (8-char codes, 2% recurring commissions)
- FCM notification service
- CI/CD — GitHub Actions → Railway (server) + Vercel (web) + EAS (mobile)
- Mobile: full auth flow (login, signup, forgot-password, verify-email, reset-password)
- Mobile: tab navigation — 5 tabs (Home, Marketplace, Foraging Map, Messages, Profile)
- Mobile: all tab screens wired to real API via TanStack Query (11 hooks in src/lib/hooks.ts)
- Mobile: SecureStore token persistence, auth loading state, SQLiteStorage initialized on boot
- Mobile: API client (src/lib/api.ts) with ApiRequestError, typed authApi endpoints
- Web: typed API client (lib/api.ts), IndexedDB init on App mount, ErrorBoundary in main.tsx
- Web: auth.ts has both Zustand store (reactive) and plain getToken/setToken exports (for API use)
- Server: request timeout middleware (30s), Stripe webhook secret production validation
- CI/CD: fixed railway link bug, fixed health check URL (/api/health), fixed EAS profile
- CI/CD: type checking step now runs tsc --noEmit per package (was running lint twice)
- turbo.json: updated from deprecated `pipeline` key to `tasks` (Turbo v2)
- Database: PostgreSQL (Neon serverless) for production, SQLite fallback for local dev
  - `packages/server/src/schema.ts` — PG schema (31 tables, pgTable, jsonb, boolean, timestamp)
  - `packages/server/src/db.ts` — env-based: DATABASE_URL→Neon, else→SQLite
  - All 22 server files updated from `@eat/shared/schema` imports → `./schema` / `../schema`
  - `packages/server/drizzle.config.ts` — auto-selects PG or SQLite dialect
  - `DATABASE_URL` added to production required vars in config.ts

### ⏳ Pending (Required Before Launch)
- **BLOCKER:** Create mobile assets directory — icon.png, splash.png, adaptive-icon.png, etc. (see packages/mobile/assets/README.md)
- **BLOCKER:** Set `extra.eas.projectId` in app.json (currently "TBD") — run `eas init` to get UUID
- Set `DATABASE_URL` in Railway dashboard — same value as in `packages/server/.env` (Neon project: `eat-platform`, ID: `calm-voice-93662463`)
- Configure external services: Firebase, Agora, Stripe, Resend, Redis, Google Maps (all have .env.example docs)
- Replace PWA placeholder SVG icons with real PNG files
- App store submission: replace placeholder values in eas.json (Apple ID, Team ID, etc.)
- Mobile: react-native-maps real interactive map (currently placeholder UI)
- Mobile: Socket.IO real-time messaging in app (currently REST polling via /api/conversations)
- Mobile: image upload flow for listings and foraging spots
- Device testing on physical iOS + Android

### 🚫 Not Required for MVP
- JWT refresh tokens (7-day tokens handled via SecureStore + /api/auth/me on boot)
- Listing/review counts on profile stats (TODOs marked in profile.tsx)

---

## Model Selection Rules

**Use Haiku** for: file edits, commands, directory ops, schema queries, simple refactoring

**Use Sonnet** for: API endpoints, complex logic, migrations, error handling, multi-file changes

**Use agents** for: large refactoring, exploring unknown codebase sections, parallel research, multi-phase implementation

---

## Error Handling Standards

**Every function MUST:**
```typescript
try {
  if (!input) throw new Error("Input required");
  const result = await operation();
  logger.info("Operation succeeded", { result });
  return result;
} catch (error) {
  logger.error("Operation failed", { error, input });
  throw new AppError("Operation failed", 500, { cause: error });
}
```

**API routes MUST:**
- Validate request body with Zod
- Use try/catch blocks
- Return structured errors: `{ error: string, details?: any }`
- Return appropriate status codes: 400, 401, 403, 404, 409, 500

**Database operations MUST:**
- Use transactions for multi-step operations
- Handle unique constraint violations + foreign key violations
- Retry on deadlocks (max 3 attempts)

---

## Database

**Shared schema (SQLite — mobile offline):** `packages/shared/schema.ts`
**Server schema (PostgreSQL — production):** `packages/server/src/schema.ts`
**Total tables:** 31 (25 main + 6 infrastructure)
**ORM:** Drizzle ORM
**Production adapter:** `@neondatabase/serverless` (Neon HTTP) via `DATABASE_URL`
**Dev fallback:** `better-sqlite3` via `DATABASE_PATH` (when `DATABASE_URL` is unset)

**All tables include sync metadata:**
```typescript
version, syncStatus, lastSyncedAt, deviceId, isDeleted, deletedAt
```

### Main Tables (25)

| Table | Key Fields |
|-------|-----------|
| `users` | id, name, email, passwordHash, country, region, city, bio, profileImageUrl, interests[], skills[], offerings[], referralCode, referredBy, creditBalance, role, emailVerified, isPremium, stripeCustomerId, isActive, isBanned |
| `memberProfiles` | id, userId(FK), website, socialLinks, phoneNumber, address |
| `listings` | id, ownerUserId(FK), type(sell/buy/trade/barter/rent/lease), category, title, description, images[], price, currency, location, latitude, longitude, availabilityStatus, isFeatured, viewCount |
| `vendors` | id, linkedUserId(FK), name, description, logoUrl, type(ecoFriendly/indigenous/serviceProvider/accommodation), website, email, phone, address, city, country, latitude, longitude, verified, rating, reviewCount |
| `coupons` | id, vendorId(FK), title, discountType, discountValue, code, validFrom, validTo, maxUses, currentUses |
| `foragingSpots` | id, createdByUserId(FK), latitude, longitude, title, plantType, species, description, images[], edibleParts, seasonality, benefits, accessNotes, isVerified, country, region |
| `gardenClubs` | id, name, description, city, country, region, latitude, longitude, contactInfo, email, meetingSchedule, website, imageUrl, memberCount |
| `seedBanks` | id, name, locationText, latitude, longitude, description, managedByUserId(FK), seedsAvailable[], email, phone, website |
| `resourceHubs` | id, type(water/solar/wind/compost), name, latitude, longitude, description, accessRules, contactInfo, createdByUserId(FK) |
| `events` | id, title, description, hostUserId(FK), hostClubId(FK), type(workshop/meetup/market/tour/webinar), startDateTime, endDateTime, timeZone, locationAddress, latitude, longitude, capacity, registeredCount, imageUrl, price, currency, isFeatured, status |
| `eventRegistrations` | id, eventId(FK), userId(FK), status(registered/attended/cancelled), registeredAt |
| `trainingModules` | id, title, category, difficultyLevel, description, content, videoUrl, imageUrl, estimatedDuration, isPremium, order |
| `userTrainingProgress` | id, userId(FK), moduleId(FK), completed, completedAt, progressPercent, lastAccessedAt |
| `mealPlans` | id, userId(FK), name, description, dietaryPreference, days, isPublic |
| `recipes` | id, createdByUserId(FK), dietaryPreference, title, description, ingredients[], instructions, prepTime, cookTime, servings, nutritionSummary, imageUrl, isPublic, tags[] |
| `shoppingLists` | id, userId(FK), linkedMealPlanId(FK), name, items[] |
| `chatMessages` | id, senderUserId(FK), recipientUserId(FK), messageType(text/image/file), content, attachmentUrl, isRead, readAt |
| `reviews` | id, reviewerUserId(FK), subjectType(listing/vendor/user/recipe), subjectId, rating(1-5), title, comment, isVerified |
| `jobPosts` | id, postedByUserId(FK), vendorId(FK), title, description, jobType(fullTime/partTime/contract/volunteer/internship), locationText, isRemote, salaryMin, salaryMax, salaryCurrency, requirements[], status, expiresAt |
| `jobApplications` | id, jobId(FK), applicantUserId(FK), coverLetter, resumeUrl, status(pending/reviewed/interviewed/accepted/rejected) |
| `creditTransactions` | id, userId(FK), type(earned/spent/purchased/refunded/referral_bonus/vendor_commission/recurring_commission), amount, description, relatedEntityType, relatedEntityId |
| `subscriptionPlans` | id, name, description, price, currency, interval(monthly/yearly), features[], stripePriceId, isActive |
| `payments` | id, userId(FK), amount, currency, status(pending/completed/failed/refunded), paymentMethod(stripe/credits), stripePaymentIntentId |
| `notifications` | id, userId(FK), type(message/event/listing/review/system), title, message, link, isRead, readAt |
| `auditLogs` | id, userId(FK), action(create/update/delete/ban/verify), entityType, entityId, oldValues, newValues, ipAddress, userAgent |

### Infrastructure Tables (6)

| Table | Purpose |
|-------|---------|
| `syncQueue` | Offline operation queue — userId, deviceId, tableName, recordId, operation, data, status, retryCount |
| `deviceRegistry` | Push tokens — userId, deviceId(unique), deviceType(ios/android/web), fcmToken, lastActiveAt |
| `conflictLog` | Sync conflicts — tableName, recordId, serverData, clientData, resolution(server_wins/client_wins/manual/merged) |
| `vendorReferrals` | Referral tracking — referrerVendorId, referredVendorId, referralCode(unique), status, totalEarnings, recurringCommissionRate |
| `videoCalls` | Call sessions — callType(one_on_one/group), hostUserId, channelName(unique), agoraToken, status, startedAt, endedAt, duration |
| `videoCallParticipants` | Call members — callId(FK), userId(FK), joinedAt, leftAt, isMuted, isVideoOn |

**Migrations:**
```bash
cd packages/server && npm run db:migrate
# or: npm run db:push  (schema push without migration file)
```

---

## API Structure

**Base URL:** `/api` for all standard routes
**Sync/Device routes only:** `/api/v1/sync/*` and `/api/v1/devices/*`
**Auth:** JWT Bearer tokens — payload: `{ userId: string }`, 7-day expiration, no refresh tokens
**Real-time:** Socket.IO on `/socket.io`

### All Endpoints

**Auth** (`/api/auth/`)
- `POST /signup` | `POST /login` | `POST /verify-email` | `POST /resend-verification`
- `POST /forgot-password` | `POST /reset-password` | `GET /me`

**Members** — `GET /api/members` | `GET /api/members/:id` | `PUT /api/profile` | `POST /api/profile/image`

**Listings** — `GET` (list/nearby/my-listings) | `GET /:id` | `POST` | `POST /:id/images` | `PUT /:id` | `DELETE /:id`

**Vendors** — `GET` (list) | `GET /:id` | `POST` | `POST /:id/verify` (mod/admin only)

**Foraging Spots** — `GET` (list/recent) | `GET /:id` | `POST` | `PUT /:id` | `DELETE /:id`

**Events** — `GET` (list/upcoming) | `GET /:id` | `POST` | `POST /:id/register` | `PUT /:id` | `DELETE /:id`

**Training** — `GET /api/training-modules` | `GET /:id` | `POST /:id/complete`

**Jobs** — `GET` (list) | `GET /:id` | `POST` | `PUT /:id` | `DELETE /:id`

**Messaging (REST polling)** — `GET /api/conversations` | `GET /api/messages/:userId?since=` | `POST /api/messages` | `GET /api/messages/unread/count`

**Reviews** — `GET /api/reviews/:subjectType/:subjectId` | `POST /api/reviews`

**Notifications** — `GET /api/notifications` | `POST /api/notifications/mark-read` | `GET /api/notifications/unread/count`

**Subscriptions** — `GET /api/subscription/plans` | `GET /api/subscription/status` | `POST /api/subscription/checkout` | `GET /api/subscription/success` | `POST /api/subscription/cancel` | `POST /api/webhooks/stripe`

**Admin** (admin role required) — `GET/POST/PUT /api/admin/users` | `POST /api/admin/users/:id/ban|unban|role` | `GET /api/admin/audit-logs` | `GET /api/admin/stats` | `POST /api/admin/training-modules`

**Misc** — `GET /api/config/maps` | `GET /api/health`

**Sync (v1)** — `POST /api/v1/sync/push` | `POST /api/v1/sync/pull` | `GET /api/v1/sync/status`

**Devices (v1)** — `POST /api/v1/devices/register` | `PUT /api/v1/devices/:deviceId`

**Endpoint pattern:**
```typescript
router.post("/api/resource",
  authenticateToken,
  rateLimiter,
  validateBody(schema),
  async (req, res) => {
    try {
      const result = await service.create(req.body, req.userId);
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  }
);
```

---

## Socket.IO Events

**Service:** `packages/server/src/services/messaging/MessageService.ts`
**Auth:** JWT via `socket.handshake.auth.token` — disconnects if invalid
**Rooms:** Each user joins `user:{userId}`

### Client → Server
| Event | Payload |
|-------|---------|
| `message:send` | `{ recipientUserId, content, messageType?, attachmentUrl? }` |
| `message:read` | `{ messageId }` |
| `message:typing` | `{ recipientUserId }` |
| `message:stop-typing` | `{ recipientUserId }` |
| `disconnect` | (built-in) |

### Server → Client
| Event | Payload |
|-------|---------|
| `message:sent` | confirmation (to sender) |
| `message:new` | message object (to recipient if online) |
| `message:read` | `{ messageId, readAt }` (to sender) |
| `typing:start` | `{ userId }` |
| `typing:stop` | `{ userId }` |
| `error` | `{ message, details? }` |

---

## Authentication Details

**Location:** `packages/server/src/auth.ts`
- JWT payload: `{ userId: string }` — HS256, 7-day expiry, **no refresh tokens**
- Passwords: bcrypt, 10 rounds, requires 8+ chars, uppercase, lowercase, number
- Middleware: `authenticateToken()` — reads `Authorization: Bearer <token>`, attaches `req.userId`
- Returns 401 if token missing or invalid
- Email verification token: 32-byte hex, expires 24h
- Password reset token: 32-byte hex, expires 1h
- Referral codes: 10-char uppercase hex
- `sanitizeUser()` strips: passwordHash, emailVerificationToken, emailVerificationExpires, passwordResetToken, passwordResetExpires, stripeCustomerId

---

## State Management

- **Server state:** React Query (`@tanstack/react-query`) — used in both mobile and web
- **Local persistence:** SQLiteStorage (mobile, `packages/mobile/src/lib/storage/`) | IndexedDB/Dexie (web)
- **No Zustand** — all global state handled by React Query + storage layer

---

## Mobile Routes (Expo Router)

**Location:** `packages/mobile/app/`

```
app/
├── _layout.tsx              # Root: SQLiteStorage init → QueryClient → AuthGuard
├── index.tsx                # Welcome screen → /(auth)/login
├── (auth)/
│   ├── _layout.tsx          # Auth Stack (headerShown: false)
│   ├── login.tsx            # ✅ Full API integration + SecureStore
│   ├── signup.tsx           # ✅ Full API integration
│   ├── forgot-password.tsx  # ✅ Email reset + success state
│   ├── verify-email.tsx     # ✅ 60s resend countdown
│   └── reset-password.tsx   # ✅ Deep-link token from params
└── (tabs)/
    ├── _layout.tsx          # ✅ Bottom tab bar (5 tabs, Ionicons)
    ├── index.tsx            # ✅ Home — greeting, notif badge, upcoming events
    ├── marketplace.tsx      # ✅ Real listings — search, filter, pull-to-refresh
    ├── map.tsx              # ✅ Real foraging spots — season tags, verified badge
    ├── messages.tsx         # ✅ Real conversations — unread badges, relative time
    └── profile.tsx          # ✅ Real user data — sign out, stats, menu
```

**Auth state flow:** SQLiteStorage init → SecureStore token check → `/api/auth/me` → route to (tabs) or (auth)/login

---

## Web Routes (Wouter)

**Location:** `packages/web/client/src/App.tsx`

**Public:**
- `/auth/login` | `/auth/signup` | `/auth/verify-email` | `/auth/forgot-password` | `/auth/reset-password`
- `/terms` | `/privacy`

**Authenticated (AuthGuard + AuthenticatedLayout + AppSidebar):**
- `/` Dashboard
- `/marketplace` | `/marketplace/create` | `/marketplace/edit/:id`
- `/foraging-map` | `/foraging-map/create` | `/foraging-map/edit/:id`
- `/vendors` | `/members`
- `/events` | `/events/create` | `/events/edit/:id`
- `/learning`
- `/jobs` | `/jobs/create` | `/jobs/edit/:id`
- `/messages`
- `/profile`
- `*` 404

---

## Mobile Storage Layer

**Location:** `packages/mobile/src/lib/storage/`

| File | Purpose |
|------|---------|
| `SQLiteStorage.ts` | Core implementation — Expo SQLite + Drizzle, `eat.db` |
| `types.ts` | StorageInstance, QueueStats, SyncStatus, FilterOptions, HealthCheckResult |
| `index.ts` | Exports SQLiteStorage + all types |
| `SQLiteStorage.example.ts` | Usage examples |

**Key methods:** `getSyncQueue` | `addToSyncQueue` | `updateSyncQueueStatus` | `getRecord` | `upsertRecord` | `deleteRecord` | `getLastSyncedAt` | `setLastSyncedAt` | `getUnresolvedConflicts` | `addConflict`

---

## Token Saving Strategies

**DO:**
- Reference files by path instead of showing full content
- Use parallel tool calls for independent tasks
- Batch similar operations in one message

**DON'T:**
- Show entire files when only a snippet changed
- Repeat instructions already given
- Explain basic concepts (React, TypeScript, etc.)
- Generate duplicate code

---

## Development Workflow

**Ports:** Server: 5000 (`.env PORT`) | Web: check vite.config.ts | Mobile: Expo (default 8081)

**Start dev servers:**
```bash
npm run dev      # All packages in parallel
npm run mobile   # Expo only
npm run web      # Vite only
npm run server   # Express only
```

**Before committing:**
1. `npm run lint`
2. `npm test`
3. Check console errors
4. Test offline mode

**Deployment:**
- Web: Vercel (auto-deploy from `main`)
- Server: Railway (auto-scale)
- Mobile: `eas build --platform all`

---

## Common Tasks

**Add API endpoint:**
1. Define route in `packages/server/src/routes/v1/` (sync/device) or `packages/server/src/routes.ts` (everything else)
2. Validate with Zod schema
3. Implement service logic
4. Add error handling
5. Test with Postman/Thunder Client

**Add offline sync:**
1. Add sync metadata to schema table
2. Queue mutations in `syncQueue` when offline
3. Handle in `SyncManager.performSync()`
4. Test offline → online flow

**Add push notification:**
1. Add device token to `deviceRegistry`
2. Call `NotificationService.sendToUser()`
3. Include notification type and data
4. Test on physical device

**Add video call:**
1. Create Agora channel with `AgoraService`
2. Generate token for participants (24h expiry)
3. Insert record in `videoCalls` table
4. Join channel in UI with Agora SDK

**Add mobile screen:**
1. Create file in `packages/mobile/app/` (Expo Router file-based)
2. Build tab navigation in `app/(tabs)/` first if needed
3. Connect to API via React Query

---

## Troubleshooting

**Database locked:** Check unclosed connections, use transactions, restart server

**Sync conflicts:** Check `conflictLog` table, default is last-write-wins

**Push notifications not working:** Verify FCM token in `deviceRegistry`, test on physical device (not simulator)

**Video call failing:** Check Agora credentials, verify channel name unique, check token not expired (24h)

**Port conflicts:** Default server port is 5000 from `.env`, README references 3001 — check `.env PORT`

---

## Security

**NEVER:** Commit `.env` | Log passwords/tokens | Return stack traces | Skip input validation | Use `eval()`

**ALWAYS:** bcrypt passwords (10 rounds) | Validate JWTs on protected routes | Rate limit auth endpoints | Sanitize input | Use parameterized queries

---

## Performance

- Redis for frequently accessed data
- CDN for images/videos (Cloudflare R2)
- Paginate lists (default: 20 items)
- Index DB columns used in WHERE clauses
- React.memo for expensive components

**Targets:** API p95 < 500ms | DB query < 100ms | SQLite query < 50ms | Sync success rate 99%+ | Crash-free sessions 99.5%+

---

## External Services

| Service | Purpose | Config Key |
|---------|---------|-----------|
| Agora | Video calling | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| Firebase | Push notifications | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` |
| Stripe | Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Cloudflare R2 | Media CDN | `CLOUDFLARE_R2_ACCESS_KEY` |
| Redis | Caching/sessions | `REDIS_URL` |
| Resend | Email | `RESEND_API_KEY` |
| Google Maps | Foraging map | `GOOGLE_MAPS_API_KEY` |

**All services degrade gracefully in development** — platform works without them locally.

---

## Testing

**Unit:** `npm test` | **E2E:** `npm run test:e2e` | **Coverage target:** 80%

**Critical flows:**
- Signup → email verification → login
- Create listing offline → sync when online
- Send message via WebSocket
- Start video call
- Vendor referral + commission calculation

---

## Response Format

**Code changes:**
```
✅ Changed: file_path:line_number
Summary: Brief description
Testing: How to verify
```

**Errors:**
```
❌ Error: Description
Cause: Root cause
Fix: Solution steps
```

**Complex tasks:** Use todo list to track progress. Update after each step.

---

## CLAUDE.md Maintenance Rule

**This file MUST be updated when:**
- New tables added or schema changed
- New API endpoints added
- New services or packages created
- A feature moves from ⏳ Pending → ✅ Complete
- Architectural decisions are made
- Port, URL, or config values change

**Update this file before ending any session with significant changes.**

---

*~20,000 lines of code across 85+ production files. Optimized for token efficiency — reference, don't repeat.*
