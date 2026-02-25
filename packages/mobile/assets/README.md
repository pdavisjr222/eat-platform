# Mobile Assets — Required Before Building

All files listed here are referenced in `app.json` and must exist before
running `expo start`, Expo Go, or any EAS build.

## Required Files

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 px | App icon (iOS + Android) |
| `splash.png` | 1284×2778 px | Splash screen (portrait) |
| `adaptive-icon.png` | 1024×1024 px | Android adaptive icon foreground |
| `favicon.png` | 48×48 px | Web favicon |
| `notification-icon.png` | 96×96 px | Android notification icon (white on transparent) |
| `notification-sound.wav` | — | Push notification sound |

## Design Specs

- **Brand color:** `#22c55e` (green) — used as splash + adaptive icon background
- **Icon:** 🌱 E.A.T. logo on green background (or full branded design)
- **Notification icon:** Must be white silhouette on transparent background (Android requirement)
- **Splash:** Centered logo on white or green background, `resizeMode: contain`

## Quick Start (Placeholder Assets)

To unblock development with temporary placeholder assets, run from this directory:
```bash
# Requires ImageMagick — generates solid-color placeholder PNGs
convert -size 1024x1024 xc:#22c55e icon.png
convert -size 1284x2778 xc:#22c55e splash.png
convert -size 1024x1024 xc:#22c55e adaptive-icon.png
convert -size 48x48 xc:#22c55e favicon.png
convert -size 96x96 xc:white notification-icon.png
```

Or use any image editor to create the required sizes.

## Production Assets

Replace placeholders with the real branded design before:
- Submitting to App Store / Google Play
- Running `eas build --profile production`
- Any public beta or TestFlight release
