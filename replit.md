# E.A.T. - Ecology Agriculture Trade Platform

## Overview

E.A.T. (Ecology Agriculture Trade) is a full-stack web application designed for a global community of nature lovers, gardeners, and farmers who value sustainability and eco-friendly living. The platform facilitates peer-to-peer marketplace transactions, knowledge sharing, foraging location discovery, and community engagement around sustainable agriculture and ecological practices.

The application supports multiple core features including:
- Marketplace for buying, selling, trading, and bartering sustainable goods
- Interactive foraging maps showing wild edible plants and fruit trees
- Vendor directory for eco-friendly and indigenous businesses
- Community member profiles and messaging
- Events calendar for workshops, farmers markets, and eco-tours
- Learning hub with training modules
- Job board for eco-friendly employment opportunities
- Credit-based reputation and referral system

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite as the build tool

**Routing:** Wouter for client-side routing with protected routes via AuthGuard component

**UI Component System:** Radix UI primitives with shadcn/ui components styled using Tailwind CSS
- Design approach follows Material Design with nature-inspired customization
- Typography: Inter for body/UI, Merriweather for headings
- Mobile-first responsive design
- Custom color palette with earth-friendly green primary colors

**State Management:**
- TanStack Query (React Query) for server state and caching
- Zustand with persist middleware for authentication state
- Query client configured with infinite stale time and disabled automatic refetching

**Design System:**
- Component library located in `client/src/components/ui/`
- Theme provider supports light/dark mode with localStorage persistence
- Sidebar-based navigation with collapsible menu
- Consistent spacing using Tailwind's spacing scale

### Backend Architecture

**Server Framework:** Express.js with TypeScript running on Node.js

**API Design:** RESTful API with JSON payloads
- Authentication endpoints (`/api/auth/signup`, `/api/auth/login`)
- Resource endpoints for listings, vendors, events, members, etc.
- WebSocket support via ws library for real-time messaging

**Authentication & Authorization:**
- JWT-based authentication with 7-day token expiration
- Bcrypt password hashing with 10 salt rounds
- Bearer token authentication middleware
- Role-based access control (user, vendor, moderator, admin)

**Request Handling:**
- JSON body parsing with raw body preservation for webhooks
- URL-encoded form data support
- Request logging middleware with duration tracking
- Custom error handling with structured JSON responses

**Database Layer:**
- Drizzle ORM for type-safe database operations
- Schema-first approach with Zod validation
- Database models for: users, listings, vendors, foraging spots, garden clubs, events, training modules, messages, reviews, jobs, credit transactions
- Relations defined between tables for referential integrity

### Data Storage

**Database:** PostgreSQL (via Neon serverless)
- Connection pooling using @neondatabase/serverless
- WebSocket-based connections for serverless compatibility
- Migration management via drizzle-kit

**Schema Design:**
- User profiles with location data (country, region, city, geographic region)
- Skills, interests, and offerings arrays for user capabilities
- Referral system with unique codes and credit balances
- Marketplace listings with type (sell/buy/trade/barter), category, pricing
- Geographic data (latitude/longitude) for location-based features
- Timestamp fields for tracking creation dates

**ORM Configuration:**
- Schema located in `shared/schema.ts` for sharing between client and server
- Insert schemas generated via drizzle-zod for runtime validation
- Type inference for full TypeScript support

### Authentication & Security

**Password Security:**
- Bcrypt hashing with configurable salt rounds
- Passwords never stored in plain text
- Hash comparison for login verification

**Token Management:**
- JWT tokens signed with SESSION_SECRET environment variable
- Tokens include userId payload
- 7-day expiration for user sessions
- Token verification middleware protects authenticated routes

**API Security:**
- Bearer token authentication on protected endpoints
- 401 responses for missing/invalid tokens
- User ID extraction from tokens for request context

### External Dependencies

**Core Framework Dependencies:**
- React 18+ for UI rendering
- Express for HTTP server
- Drizzle ORM for database access
- TanStack Query for data fetching

**UI Component Libraries:**
- @radix-ui/* primitives for accessible components
- Tailwind CSS for styling
- class-variance-authority and clsx for dynamic styles
- lucide-react for icons

**Authentication:**
- jsonwebtoken for JWT creation and verification
- bcrypt for password hashing

**Database:**
- @neondatabase/serverless for PostgreSQL connection
- drizzle-orm and drizzle-kit for ORM functionality
- ws for WebSocket support (required by Neon)

**Development Tools:**
- Vite for build tooling and dev server
- TypeScript for type safety
- tsx for running TypeScript in development

**Validation:**
- Zod for runtime schema validation
- @hookform/resolvers for form validation integration
- react-hook-form for form state management

**Deployment Configuration:**
- Build outputs to `dist/` directory
- Static files served from `dist/public/`
- Production server runs compiled JavaScript from dist
- Environment variables for DATABASE_URL and SESSION_SECRET required