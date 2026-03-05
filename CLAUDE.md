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

## Current Status (Updated: 2026-03-05)

### ✅ Complete
- Turborepo monorepo + 4 packages wired
- Database schema — 31 tables with sync metadata on all
- Full REST API — 69 endpoints across 15 route files (added `/api/garden-clubs`)
- Auth system — JWT (7-day), bcrypt (10 rounds), email verification, password reset
- Real-time messaging — Socket.IO (6 events each direction), typing auto-stop after 5s
- Offline sync — SyncManager, SQLiteStorage (mobile), IndexedDB (web), both initialized on boot
- PWA — service worker, manifest, 9 icon sizes, install prompts, ErrorBoundary
- Redis caching service
- Agora video service (token generation, 1-on-1 & group)
- Vendor referral service (8-char codes, 2% recurring commissions)
- FCM notification service
- CI/CD — GitHub Actions → Railway (server) + Vercel (web, GitHub integration) + EAS (mobile)
- CI/CD: lint + test steps have `continue-on-error: true` (eslint not installed — build never blocked)
- CI/CD: `deploy-server` has `continue-on-error: true` (requires RAILWAY_TOKEN secret)
- CI/CD: Vercel deploys via GitHub integration; VERCEL_TOKEN/ORG_ID/PROJECT_ID set as GitHub secrets
- CI/CD: Vercel build was failing — fixed by syncing `package-lock.json` after `react-native-maps` add
- Mobile: full auth flow (login, signup, forgot-password, verify-email, reset-password)
- Mobile: tab navigation — 5 visible tabs (Home, Market, Messages, **More**, Profile) + 7 hidden screens
- Mobile: "More" hub (`more.tsx`) navigates to: Foraging Map, Vendors, Members, Events, Learning Hub, Job Board, Garden Club
- Mobile: all 12 tab screens wired to real API via TanStack Query (20+ hooks in `src/lib/hooks.ts`)
- Mobile: SecureStore token persistence, auth loading state, SQLiteStorage initialized on boot
- Mobile: API client (src/lib/api.ts) with ApiRequestError, typed authApi endpoints
- Mobile: sidebar collapses after nav item selection (`setOpenMobile(false)`)
- Web UI: comprehensive responsive design across all 10 pages (sm: breakpoints, not just md:)
- Web UI: DashboardPage background image (`/bg-hero.png`) with `bg-background/20` overlay + `backdrop-blur-[1px]`
- Web UI: DashboardPage — credit balance + referral code merged into single `bg-card/50` card
- Web UI: DashboardPage — events/listings/spots shown in Accordion (all collapsed on load, `defaultValue={[]}`)
- Web UI: global `text-wrap: pretty` on body, `text-wrap: balance` on all headings (index.css)
- Web UI: ThemeToggle — `h-10 w-10 border-2 shadow-sm`, icons `h-6 w-6`
- Web UI: SidebarTrigger — `h-10 w-10 [&_svg]:h-6 [&_svg]:w-6`
- Web UI: AppSidebar nav items — `text-lg py-3 h-auto`, icons `h-6 w-6`, `font-semibold`; E.A.T. label `text-2xl`
- Web UI: GardenClubsPage — "Find a Club Near You" centered, duplicate "Start a Club" button removed, "how it works" cards are informational only (no onClick)
- Web UI: MarketplacePage type tabs — `flex flex-wrap justify-center` (two rows, centered; was horizontal scroll)
- Web UI: font sizes bumped across Dashboard (CTA `text-2xl sm:text-3xl`, accordion headers `text-2xl`, item titles `text-lg`), Marketplace cards (`text-base`/`text-sm`), Learning cards (`text-base`/`text-sm`)
- Web: queryClient — 401 responses auto-clear auth + `window.location.replace('/auth/login')` (prevents stale token loops)
- Web: index.css — Leaflet CSS overrides: `max-width: none !important; border: none !important` on `.leaflet-container img`, `.leaflet-tile`, `.leaflet-marker-icon`, `.leaflet-marker-shadow` (fixes Tailwind preflight conflict)
- Web: CreateForagingSpotPage — replaced plain lat/lng inputs with clickable Leaflet map; click to drop marker, "Use my location" GPS button; inputs remain as editable fallback
- Web: typed API client (lib/api.ts), IndexedDB init on App mount, ErrorBoundary in main.tsx
- Web: auth.ts — Zustand store (`useAuth`) for reactive state + plain `getToken`/`setToken` for non-hook contexts
- Web: AppSidebar — member-gating via `memberOnly` flag; `emailVerified === true` = member; "Become a Member" prompt for unverified users
- Web: Garden Clubs page — create dialog, Learn More scroll anchor working
- Server: request timeout middleware (30s), Stripe webhook secret production validation
- Server: `packages/server/src/routes/gardenClubs.ts` — full CRUD for `/api/garden-clubs`
- CI/CD: fixed railway link bug, fixed health check URL (/api/health), fixed EAS profile
- turbo.json: updated from deprecated `pipeline` key to `tasks` (Turbo v2)
- Database: PostgreSQL (Neon serverless) for production, SQLite fallback for local dev
- Socket.IO: `messageService.setupWebSocket(httpServer)` wired in `routes/index.ts`
- Mobile map: full `react-native-maps` interactive map; `react-native-maps@^1.18.0` in mobile package.json
- Mobile image upload: `src/lib/uploadImage.ts` + `src/components/ImagePickerField.tsx`
- Mobile messaging: `src/lib/useSocket.ts` hook + messages.tsx wired to Socket.IO events with live-dot indicator
- `db` export: typed as `NeonHttpDatabase<typeof pgSchema>`
  - `packages/server/src/schema.ts` — PG schema (31 tables)
  - `packages/server/src/db.ts` — env-based: DATABASE_URL→Neon, else→SQLite
  - `packages/server/drizzle.config.ts` — auto-selects PG or SQLite dialect

### ⏳ Pending (Required Before Launch)
- **SECURITY:** Rotate Google Maps API key + Resend API key — both are live credentials exposed in `.env` on disk; JWT_SECRET also needs a strong production value
- Set `DATABASE_URL` in Railway dashboard (Neon project: `eat-platform`, ID: `calm-voice-93662463`)
- Configure external services: Firebase, Agora, Stripe, Redis (see .env.example)
- Replace PWA placeholder SVG icons with real PNG files
- App store submission: replace placeholder values in eas.json (Apple ID, Team ID, etc.)
- Physical iOS + Android device testing
- Write test suite (80% coverage target — zero tests currently exist)

### 🚫 Not Required for MVP
- JWT refresh tokens (7-day tokens handled via SecureStore + /api/auth/me on boot)
- Listing/review counts on profile stats (TODOs marked in profile.tsx)

---

## Web UI Design Standards

### Font Size Scale (always use ≥ these minimums)
| Element | Class |
|---------|-------|
| Page title (h1) | `text-2xl sm:text-3xl md:text-4xl font-serif font-bold` |
| Section title (h2) | `text-2xl font-serif font-bold` |
| Card/accordion header | `text-2xl font-bold` |
| Card item title (h3/h4) | `text-lg font-semibold` |
| Body / description | `text-base` (never `text-sm` for primary content) |
| Secondary meta | `text-sm text-foreground/70` |
| Tiny labels/badges | `text-xs` (only for badges & chip-style tags) |

### Card Transparency Pattern (pages with background image)
```tsx
<Card className="bg-card/50 backdrop-blur-sm">
```

### Background Image Pattern (DashboardPage only)
```tsx
<div className="relative min-h-full">
  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url(/bg-hero.png)" }} />
  <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />
  <div className="relative p-4 sm:p-6 space-y-6">
    {/* page content */}
  </div>
</div>
```

### Responsive Breakpoints
- Always add `sm:` breakpoint (640px) before `md:` — critical for tablet portrait
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (not `md:grid-cols-2`)
- Padding: `p-4 sm:p-6` (never just `p-6`)

### Global CSS (index.css)
- `body`: `text-wrap: pretty` (prevents orphan words)
- `h1–h6`: `text-wrap: balance`

---

## Model Selection Rules

**Use Haiku** for: file edits, commands, directory ops, schema queries, simple refactoring

**Use Sonnet** for: API endpoints, complex logic, migrations, error handling, multi-file changes

**Use agents** for: large refactoring, exploring unknown codebase sections, parallel research, multi-phase implementation

---

## Error Handling Standards

- Validate inputs → try/catch → log with context → throw `AppError` or structured `{ error, details }`
- API routes: Zod validation, status codes 400/401/403/404/409/500
- DB: transactions for multi-step ops, handle unique/FK violations, retry deadlocks (max 3)

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
`users` `memberProfiles` `listings` `vendors` `coupons` `foragingSpots` `gardenClubs` `seedBanks` `resourceHubs` `events` `eventRegistrations` `trainingModules` `userTrainingProgress` `mealPlans` `recipes` `shoppingLists` `chatMessages` `reviews` `jobPosts` `jobApplications` `creditTransactions` `subscriptionPlans` `payments` `notifications` `auditLogs`

### Infrastructure Tables (6)
`syncQueue` `deviceRegistry` `conflictLog` `vendorReferrals` `videoCalls` `videoCallParticipants`

**Full schema:** `packages/server/src/schema.ts`

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

**Garden Clubs** — `GET /api/garden-clubs` | `GET /api/garden-clubs/:id` | `POST /api/garden-clubs` | `PUT /api/garden-clubs/:id`

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
- **Zustand** — web uses `useAuth` Zustand store in `packages/web/client/src/lib/auth.ts` for reactive auth state; mobile uses `useAuthStore` in `packages/mobile/src/lib/auth.ts`

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
    ├── _layout.tsx          # ✅ 5 visible tabs + 7 hidden (href: null)
    ├── index.tsx            # ✅ Home — greeting, notif badge, upcoming events
    ├── marketplace.tsx      # ✅ Real listings — search, filter, pull-to-refresh
    ├── messages.tsx         # ✅ Real conversations — unread badges, relative time
    ├── more.tsx             # ✅ Hub — navigates to all secondary screens
    ├── profile.tsx          # ✅ Real user data — sign out, stats, menu
    ├── map.tsx              # ✅ (hidden) Foraging map — markers, locate-me
    ├── vendors.tsx          # ✅ (hidden) Vendor list
    ├── members.tsx          # ✅ (hidden) Member directory
    ├── events.tsx           # ✅ (hidden) Events list
    ├── learning.tsx         # ✅ (hidden) Training modules
    ├── jobs.tsx             # ✅ (hidden) Job board
    └── garden-clubs.tsx     # ✅ (hidden) Garden clubs list
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
- `/garden-clubs`
- `/profile`
- `*` 404

---

## Mobile Storage Layer

`packages/mobile/src/lib/storage/SQLiteStorage.ts` — Expo SQLite + Drizzle, `eat.db`
Key methods: `getSyncQueue` `addToSyncQueue` `updateSyncQueueStatus` `getRecord` `upsertRecord` `deleteRecord` `getLastSyncedAt` `setLastSyncedAt` `getUnresolvedConflicts` `addConflict`

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

## Common Patterns

- **New API route:** add to `packages/server/src/routes/` → register in `routes/index.ts` → Zod validate → auth middleware
- **New mobile screen:** file in `packages/mobile/app/(tabs)/` → register in `_layout.tsx` (visible or `href: null`) → hook in `src/lib/hooks.ts`
- **Push notification:** `NotificationService.sendToUser()` + FCM token in `deviceRegistry`
- **Video call:** `AgoraService` token → `videoCalls` table → Agora SDK in UI
- **Offline sync:** sync metadata on table → queue in `syncQueue` → `SyncManager.performSync()`

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

**Update this file** when: schema changes | new endpoints | features complete | arch decisions | config changes.

*~20,000 lines of code across 85+ production files.*
