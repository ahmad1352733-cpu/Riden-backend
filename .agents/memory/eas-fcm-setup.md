---
name: EAS Build Quota & FCM Setup
description: EAS free plan build limits, FCM V1 credentials setup, and foreground service requirements
---

## EAS Free Plan Build Quota
- Free plan has limited Android builds per month (resets Aug 1)
- eas credentials is fully interactive — cannot be automated non-interactively
- OTA updates (eas update) are NOT affected by build quota

## FCM V1 Credentials Fix
- Error: "Default FirebaseApp is not initialized in process jo.riden.captain"
- APK built without google-services.json → no FCM in EAS credentials
- Fix: create Firebase project → add Android apps → download google-services.json → run `eas credentials` → rebuild
- Alternative: `eas credentials` → Android → Push notifications → FCM V1 → "Generate managed key" (uses Expo's Firebase)

## Foreground Service (Captain App)
- Code in: artifacts/riden-captain-app/tasks/backgroundTripTask.ts
- Uses expo-task-manager + Location.startLocationUpdatesAsync → Android foreground service
- Polls /api/captains/pending-trip in background → fires local notification on new trip
- Requires native rebuild (expo-task-manager is native module)
- app.json: added FOREGROUND_SERVICE + BACKGROUND_LOCATION permissions + expo-task-manager plugin
- _layout.tsx imports task at module level; index.tsx calls start/stopForegroundService on toggle

## baseURL OTA Bug (Fixed)
- _layout.tsx: setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`) — undefined in OTA updates
- Fix: added ?? 'jordan-ride-connect.replit.app' fallback
- EXPO_PUBLIC_DOMAIN only baked in via eas.json build env, not available in eas update

## Debug Endpoint Route Order (Fixed)
- /api/debug/push-log returned 401 because adminRouter uses router.use(requireAuth) without prefix
- Fix: debugRouter registered BEFORE adminRouter in routes/index.ts
