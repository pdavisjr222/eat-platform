# EAT Platform - Ecology Agriculture Trade

[![Deploy](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/deploy.yml)
[![Test](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/test.yml)
[![Railway](https://img.shields.io/badge/Railway-Deployed-success?logo=railway)](https://api.eat-platform.railway.app)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://eat-platform.vercel.app)
[![Expo](https://img.shields.io/badge/Expo-EAS%20Build-blue?logo=expo)](https://expo.dev)

A comprehensive platform connecting farmers, buyers, and stakeholders in the agricultural trade ecosystem with real-time communication, live streaming, and trading capabilities.

## Architecture

This is a monorepo managed with **Turborepo** and **npm workspaces**, containing:

```
EcologyAgricultureTrade/
├── packages/
│   ├── mobile/          # React Native (Expo) mobile app
│   ├── web/             # Next.js web application
│   ├── server/          # Express.js backend API
│   └── shared/          # Shared utilities and types
├── .github/
│   └── workflows/       # CI/CD pipelines
└── turbo.json          # Turborepo configuration
```

## Tech Stack

### Mobile (`@eat/mobile`)
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **State**: Zustand + TanStack Query
- **Database**: Expo SQLite + Drizzle ORM
- **Real-time**: Socket.io Client
- **Video**: Agora React Native SDK

### Web (`@eat/web`)
- **Framework**: Next.js 14 (App Router)
- **UI**: React + Tailwind CSS + shadcn/ui
- **State**: TanStack Query
- **Real-time**: Socket.io Client
- **Video**: Agora Web SDK

### Server (`@eat/server`)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Passport.js (Local Strategy)
- **Real-time**: Socket.io
- **Session**: Redis (via connect-redis)

### Shared (`@eat/shared`)
- **Validation**: Zod schemas
- **Types**: TypeScript types
- **Utils**: Shared utilities

## Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 14
- **Redis**: >= 6.0 (for production)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/EcologyAgricultureTrade.git
cd EcologyAgricultureTrade
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eat_platform

# Redis (production)
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-secret-key

# Agora
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate

# API
API_URL=http://localhost:3001
```

### 4. Run development servers

```bash
# Run all packages
npm run dev

# Or run specific packages
npm run server    # Backend API (port 3001)
npm run web       # Web app (port 3000)
npm run mobile    # Mobile app (Expo)
```

## Available Scripts

```bash
npm run dev       # Start all packages in development mode
npm run build     # Build all packages with Turborepo
npm run test      # Run tests across all packages
npm run lint      # Lint all packages
npm run clean     # Clean all build artifacts and node_modules

# Package-specific
npm run server    # Run server only
npm run web       # Run web only
npm run mobile    # Run mobile only
```

## CI/CD Pipeline

### Workflows

#### **deploy.yml** - Main deployment pipeline
Triggers on:
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch (for mobile builds)

Jobs:
1. **test** - Run linting and tests
2. **build** - Build all packages with Turborepo
3. **deploy-server** - Deploy API to Railway (main only)
4. **deploy-web** - Deploy web app to Vercel (main only)
5. **build-mobile** - Build mobile app with EAS (manual trigger)
6. **notify** - Send deployment status notification

#### **test.yml** - Test pipeline for PRs
Triggers on:
- Pull requests to `main` or `develop`
- Push to `develop` branch

Jobs:
1. **test** - Run tests on all packages
2. **lint-changed** - Lint only changed files
3. **test-affected** - Test affected packages
4. **security-scan** - Run npm audit
5. **comment-status** - Comment PR with test results

### Required Secrets

Configure these in GitHub repository settings:

```
RAILWAY_TOKEN         # Railway deployment token
VERCEL_TOKEN          # Vercel deployment token
VERCEL_ORG_ID         # Vercel organization ID
VERCEL_PROJECT_ID     # Vercel project ID
EXPO_TOKEN            # Expo account token for EAS builds
```

### Setting up secrets

1. **Railway**:
   ```bash
   railway login
   railway tokens create
   ```

2. **Vercel**:
   ```bash
   vercel login
   vercel link
   # Get VERCEL_ORG_ID and VERCEL_PROJECT_ID from .vercel/project.json
   vercel tokens create
   ```

3. **Expo**:
   ```bash
   expo login
   expo whoami
   # Create token at: https://expo.dev/accounts/[account]/settings/access-tokens
   ```

## Deployment

### Server (Railway)

The backend API is automatically deployed to Railway on push to `main`:

```bash
# Manual deployment
cd packages/server
railway up
```

**URL**: https://api.eat-platform.railway.app

### Web (Vercel)

The web app is automatically deployed to Vercel on push to `main`:

```bash
# Manual deployment
cd packages/web
vercel --prod
```

**URL**: https://eat-platform.vercel.app

### Mobile (EAS)

Mobile builds are triggered manually via workflow dispatch:

1. Go to **Actions** → **Deploy** workflow
2. Click **Run workflow**
3. Check **Build mobile app with EAS**
4. Click **Run workflow**

Or build locally:

```bash
cd packages/mobile
eas build --platform all
```

**Expo Dashboard**: https://expo.dev/accounts/eat-platform/projects/mobile

## Mobile Build Configuration

The mobile app uses Expo Application Services (EAS) for builds. Configuration in `packages/mobile/eas.json`:

### Build Profiles

- **development**: Development builds with simulators
- **preview**: Internal testing builds (APK/IPA)
- **production**: Production builds (AAB/IPA) with auto-increment

### Building locally

```bash
cd packages/mobile

# Development build
eas build --profile development --platform ios

# Preview build
eas build --profile preview --platform android

# Production build
eas build --profile production --platform all
```

### Submitting to stores

```bash
# iOS App Store
eas submit --platform ios --profile production

# Google Play Store
eas submit --platform android --profile production
```

## Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=packages/server
npm run test --workspace=packages/web
npm run test --workspace=packages/mobile
```

## Linting

```bash
# Lint all packages
npm run lint

# Lint specific package
npm run lint --workspace=packages/server
```

## Project Structure

```
packages/
├── mobile/
│   ├── app/                 # Expo Router pages
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks
│   ├── services/           # API services
│   ├── store/              # Zustand stores
│   ├── eas.json            # EAS build configuration
│   └── package.json
├── web/
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── lib/               # Utilities
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/        # Express routes
│   │   ├── db/           # Database schemas
│   │   ├── middleware/   # Express middleware
│   │   └── services/     # Business logic
│   └── package.json
└── shared/
    ├── types/             # TypeScript types
    ├── schemas/           # Zod validation schemas
    └── utils/            # Shared utilities
```

## Features

- User authentication and authorization
- Real-time chat and messaging
- Live video streaming (Agora)
- Product listings and trading
- Order management
- Location-based services
- Push notifications
- File uploads
- User profiles and roles

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@eat-platform.com or open an issue in the repository.

---

**Built with** ❤️ **using Turborepo, Next.js, Expo, and Express**
