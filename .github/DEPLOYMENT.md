# Deployment Guide

This document provides detailed instructions for setting up and using the CI/CD pipeline for the EAT Platform.

## Overview

The platform uses GitHub Actions for continuous integration and deployment with the following services:

- **Railway** - Backend API deployment
- **Vercel** - Web application deployment
- **Expo (EAS)** - Mobile app builds

## Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

1. GitHub repository with admin access
2. Railway account and project
3. Vercel account and project
4. Expo account with EAS enabled
5. Node.js 18+ installed locally

## Setup Instructions

### 1. GitHub Repository Setup

1. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/EcologyAgricultureTrade.git
   git push -u origin main
   ```

2. Enable GitHub Actions in your repository settings

### 2. Railway Setup

#### Create Railway Project

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   railway init
   ```

4. Link the server package:
   ```bash
   cd packages/server
   railway link
   ```

5. Add PostgreSQL database:
   ```bash
   railway add postgresql
   ```

6. Set environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `SESSION_SECRET=your-secret-key`
   - `AGORA_APP_ID=your-agora-app-id`
   - `AGORA_APP_CERTIFICATE=your-agora-certificate`

#### Generate Railway Token

1. Generate a deployment token:
   ```bash
   railway tokens create
   ```

2. Copy the token and add it to GitHub Secrets as `RAILWAY_TOKEN`

### 3. Vercel Setup

#### Create Vercel Project

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link the web package:
   ```bash
   cd packages/web
   vercel link
   ```

4. This creates a `.vercel/project.json` file with your project details

#### Generate Vercel Token

1. Go to https://vercel.com/account/tokens

2. Create a new token with deployment permissions

3. Add to GitHub Secrets as `VERCEL_TOKEN`

#### Get Project IDs

From `.vercel/project.json`, copy:
- `orgId` → Add to GitHub Secrets as `VERCEL_ORG_ID`
- `projectId` → Add to GitHub Secrets as `VERCEL_PROJECT_ID`

### 4. Expo (EAS) Setup

#### Initialize EAS

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure the mobile project:
   ```bash
   cd packages/mobile
   eas build:configure
   ```

#### Generate Expo Token

1. Go to https://expo.dev/accounts/[your-account]/settings/access-tokens

2. Create a new access token

3. Add to GitHub Secrets as `EXPO_TOKEN`

#### Configure App Credentials

For iOS:
1. Generate Apple credentials:
   ```bash
   eas credentials
   ```

2. Update `eas.json` with your Apple ID, ASC App ID, and Team ID

For Android:
1. Generate or upload your keystore:
   ```bash
   eas credentials
   ```

2. Create a Google Play service account JSON and save as `google-play-service-account.json`

### 5. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

#### Navigate to Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `RAILWAY_TOKEN` | Railway deployment token | `railway tokens create` |
| `VERCEL_TOKEN` | Vercel deployment token | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | From `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | From `.vercel/project.json` |
| `EXPO_TOKEN` | Expo access token | https://expo.dev/accounts/[account]/settings/access-tokens |

## Workflows

### Deploy Workflow (`deploy.yml`)

**Triggers:**
- Push to `main` branch (full deployment)
- Pull requests to `main` (test + build only)
- Manual workflow dispatch (for mobile builds)

**Jobs:**

1. **test** - Runs linting and tests
   - Installs dependencies
   - Runs ESLint
   - Runs test suites

2. **build** - Builds all packages
   - Uses Turborepo for efficient builds
   - Caches build artifacts
   - Uploads artifacts for deployment jobs

3. **deploy-server** (main only)
   - Downloads build artifacts
   - Deploys to Railway
   - Runs health check

4. **deploy-web** (main only)
   - Downloads build artifacts
   - Deploys to Vercel
   - Verifies deployment

5. **build-mobile** (manual trigger)
   - Builds iOS and Android apps with EAS
   - Triggered via workflow dispatch
   - Comments build status on PRs

6. **notify**
   - Sends deployment status notifications
   - Reports success/failure

### Test Workflow (`test.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `develop` branch

**Jobs:**

1. **test** - Full test suite
   - Linting
   - Type checking
   - Unit tests
   - Upload coverage reports

2. **lint-changed** - Incremental linting
   - Only lints files changed in PR
   - Faster feedback for PRs

3. **test-affected** - Affected package tests
   - Tests only packages affected by changes
   - Optimized for monorepo

4. **security-scan** - Vulnerability scanning
   - Runs `npm audit`
   - Fails on high severity issues

5. **comment-status** - PR comments
   - Posts test results to PR
   - Shows status of all checks

## Usage

### Automatic Deployments

**Push to main:**
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

This triggers:
1. Tests and linting
2. Build all packages
3. Deploy server to Railway
4. Deploy web to Vercel

### Manual Mobile Builds

1. Go to GitHub Actions tab
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Check "Build mobile app with EAS"
5. Click "Run workflow" button

Or via GitHub CLI:
```bash
gh workflow run deploy.yml -f build_mobile=true
```

### Pull Request Testing

Create a PR to `main`:
```bash
git checkout -b feature/new-feature
git add .
git commit -m "feat: add feature"
git push origin feature/new-feature
```

Then create PR via GitHub. This triggers:
- Full test suite
- Linting of changed files
- Affected package tests
- Security scan
- Automatic PR comment with results

## Monitoring

### Deployment Status

Check deployment status in:
- **GitHub Actions**: Repository → Actions tab
- **Railway**: https://railway.app/dashboard
- **Vercel**: https://vercel.com/dashboard
- **Expo**: https://expo.dev/accounts/[account]/projects/mobile/builds

### Status Badges

Add to your README:

```markdown
[![Deploy](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/deploy.yml)
[![Test](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/EcologyAgricultureTrade/actions/workflows/test.yml)
```

### Health Checks

The deploy workflow includes health checks:

**Server:**
```bash
curl https://api.eat-platform.railway.app/health
```

**Web:**
```bash
curl https://eat-platform.vercel.app
```

## Troubleshooting

### Common Issues

#### 1. Railway Deployment Fails

**Error**: "Railway token invalid"

**Solution**:
```bash
railway tokens create
# Update RAILWAY_TOKEN in GitHub Secrets
```

#### 2. Vercel Deployment Fails

**Error**: "Project not found"

**Solution**:
```bash
cd packages/web
vercel link --yes
# Update VERCEL_ORG_ID and VERCEL_PROJECT_ID
```

#### 3. EAS Build Fails

**Error**: "Credentials not configured"

**Solution**:
```bash
cd packages/mobile
eas credentials
# Follow prompts to configure credentials
```

#### 4. Tests Fail

**Error**: "Module not found"

**Solution**:
```bash
npm ci
npm run build
npm run test
```

#### 5. Cache Issues

Clear GitHub Actions cache:
1. Go to Actions tab
2. Click "Caches" in left sidebar
3. Delete old caches

Or in workflow:
```bash
# Add to workflow
- name: Clear cache
  run: npm cache clean --force
```

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
API_URL=http://localhost:3001
```

### Staging (Preview)

```env
NODE_ENV=staging
API_URL=https://staging-api.eat-platform.railway.app
```

### Production

```env
NODE_ENV=production
API_URL=https://api.eat-platform.railway.app
```

## Best Practices

1. **Always test locally before pushing**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

2. **Use feature branches**
   - Never commit directly to `main`
   - Create PRs for code review

3. **Keep secrets secure**
   - Never commit `.env` files
   - Rotate tokens periodically
   - Use GitHub Secrets for sensitive data

4. **Monitor deployments**
   - Check Action logs for failures
   - Set up notifications for failed deployments
   - Review build times and optimize if needed

5. **Update dependencies regularly**
   ```bash
   npm update
   npm audit fix
   ```

## Advanced Configuration

### Custom Build Commands

Edit `turbo.json` to customize build pipeline:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### Environment Variables Per Package

In package-specific workflows:

```yaml
- name: Set package env
  working-directory: packages/server
  run: |
    echo "CUSTOM_VAR=value" >> $GITHUB_ENV
```

### Conditional Deployments

Deploy only specific packages:

```yaml
if: contains(github.event.head_commit.modified, 'packages/server')
```

## Rollback Procedures

### Railway Rollback

```bash
railway status
railway rollback [deployment-id]
```

### Vercel Rollback

1. Go to Vercel dashboard
2. Select project → Deployments
3. Find previous deployment
4. Click "..." → "Promote to Production"

### Mobile Rollback

Submit previous build to app stores:

```bash
eas submit --platform ios --latest --id [build-id]
```

## Support

For issues with:
- **GitHub Actions**: https://github.com/actions
- **Railway**: https://railway.app/help
- **Vercel**: https://vercel.com/support
- **Expo**: https://expo.dev/support

---

Last updated: 2026-01-08
