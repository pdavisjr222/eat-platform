# CI/CD Quick Reference Guide

## Quick Setup (5 minutes)

### 1. Install Required Tools
```bash
npm install -g @railway/cli vercel eas-cli
```

### 2. Login to Services
```bash
railway login
vercel login
eas login
```

### 3. Run Setup Script
```bash
chmod +x scripts/setup-ci.sh
./scripts/setup-ci.sh
```

### 4. Add GitHub Secrets
Go to: `Settings → Secrets and variables → Actions → New repository secret`

| Secret | Get From |
|--------|----------|
| `RAILWAY_TOKEN` | `railway tokens create` |
| `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `packages/web/.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `packages/web/.vercel/project.json` |
| `EXPO_TOKEN` | https://expo.dev/accounts/[account]/settings/access-tokens |

## Common Commands

### Deploy to Production
```bash
git add .
git commit -m "deploy: update production"
git push origin main
```

### Trigger Mobile Build
```bash
# Via GitHub UI
Actions → Deploy → Run workflow → Check "Build mobile"

# Via GitHub CLI
gh workflow run deploy.yml -f build_mobile=true
```

### Manual Deployments

**Server (Railway):**
```bash
cd packages/server
railway up
```

**Web (Vercel):**
```bash
cd packages/web
vercel --prod
```

**Mobile (EAS):**
```bash
cd packages/mobile
eas build --platform all
```

## Workflow Triggers

| Workflow | Trigger | What Happens |
|----------|---------|--------------|
| `deploy.yml` | Push to `main` | Test → Build → Deploy all |
| `deploy.yml` | PR to `main` | Test → Build only |
| `deploy.yml` | Manual dispatch | Custom (mobile build) |
| `test.yml` | PR to `main`/`develop` | Full test suite |
| `test.yml` | Push to `develop` | Full test suite |

## Environment URLs

| Service | URL | Status |
|---------|-----|--------|
| **API** | https://api.eat-platform.railway.app | [![Railway](https://img.shields.io/badge/Railway-Live-success)](https://api.eat-platform.railway.app/health) |
| **Web** | https://eat-platform.vercel.app | [![Vercel](https://img.shields.io/badge/Vercel-Live-success)](https://eat-platform.vercel.app) |
| **Mobile** | https://expo.dev | [![Expo](https://img.shields.io/badge/Expo-Builds-blue)](https://expo.dev) |

## Troubleshooting

### Build Fails

**Check logs:**
```bash
# GitHub Actions logs
Actions tab → Select workflow run → View logs

# Railway logs
railway logs

# Vercel logs
vercel logs
```

**Common fixes:**
```bash
# Clear cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Deployment Fails

**Railway:**
```bash
railway status
railway logs --tail 100
```

**Vercel:**
```bash
vercel inspect [deployment-url]
vercel logs [deployment-url]
```

**Expo:**
```bash
eas build:list
eas build:view [build-id]
```

### Token Expired

**Regenerate tokens:**
```bash
# Railway
railway tokens create

# Vercel
# Go to: https://vercel.com/account/tokens

# Expo
# Go to: https://expo.dev/accounts/[account]/settings/access-tokens
```

Then update in GitHub Secrets.

## Workflow Jobs

### deploy.yml

```
test → build → deploy-server (main)
              → deploy-web (main)
              → build-mobile (manual)
              → notify
```

### test.yml

```
test
lint-changed (PR)
test-affected (PR)
security-scan
comment-status (PR)
```

## Cache Management

**View caches:**
```
Repository → Actions → Caches
```

**Clear specific cache:**
Delete from UI or run workflow with:
```yaml
- name: Clear cache
  run: npm cache clean --force
```

## Monitoring

### Check Deployment Status

**GitHub Actions:**
- Go to: `Actions` tab
- View workflow runs
- Check job logs

**Railway:**
```bash
railway status
railway logs
```

**Vercel:**
- Dashboard: https://vercel.com/dashboard
- CLI: `vercel list`

**Expo:**
- Dashboard: https://expo.dev
- CLI: `eas build:list`

### Health Checks

**API:**
```bash
curl https://api.eat-platform.railway.app/health
```

**Web:**
```bash
curl -I https://eat-platform.vercel.app
```

## Best Practices

1. **Always test locally first**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create PR
   ```

3. **Review PR checks before merging**
   - All tests pass ✓
   - Linting passes ✓
   - Build succeeds ✓
   - No security issues ✓

4. **Monitor deployments**
   - Check GitHub Actions
   - Verify live URLs
   - Test critical features

5. **Keep dependencies updated**
   ```bash
   npm update
   npm audit fix
   ```

## Emergency Rollback

### Railway
```bash
railway status
railway rollback [deployment-id]
```

### Vercel
1. Go to Vercel dashboard
2. Deployments → Find previous working deployment
3. Click "..." → "Promote to Production"

### Mobile
```bash
eas submit --platform ios --id [previous-build-id]
eas submit --platform android --id [previous-build-id]
```

## Useful Links

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Expo Docs**: https://docs.expo.dev
- **Turborepo Docs**: https://turbo.build/repo/docs

## Support

- Full documentation: `.github/DEPLOYMENT.md`
- Project README: `README.md`
- Issues: GitHub Issues tab

---

**Quick Start:** Run `./scripts/setup-ci.sh` to configure everything automatically!
