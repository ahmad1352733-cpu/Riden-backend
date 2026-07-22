---
name: FCM Push Resolution
description: Correct Firebase service account key and push notification setup for RIDEN
---

# FCM Push Resolution

## The correct Firebase key
- **Key ID**: `373c31611e1d8b9d09471e6ebbd0cf516bb09711`
- **Client email**: `firebase-adminsdk-fbsvc@riden2.iam.gserviceaccount.com`
- The other two keys (`51eaf80af8`, `9a515233b4`) are INVALID — produce "invalid_grant: Invalid JWT Signature"
- Credentials are hardcoded directly in `artifacts/api-server/src/lib/push.ts` (env vars mangle PEM newlines)

**Why:** There were 3 different service account JSON files. Only `373c31611e` passes FCM auth. The others were superseded/deleted in Firebase console.

## Mobile app API URL
- Both captain and passenger apps have **hardcoded** `https://riden-api-production.up.railway.app/api` in `usePushNotifications.ts`
- Do NOT use `process.env.EXPO_PUBLIC_DOMAIN` — OTA updates don't bake in env vars from eas.json build profile, so they always fall back to whatever the APK had at build time

## Token type
- Apps use `getDevicePushTokenAsync()` → raw FCM registration token
- Server uses FCM v1 HTTP API directly
- Expo Push Service is NOT used (requires FCM credentials configured in EAS dashboard which we don't have)

## GitHub push
- Never commit Firebase service account JSON files — GitHub secret scanning blocks the push
- The private key is embedded as a string literal in push.ts (acceptable, no choice)
- `.gitignore` now includes `attached_assets/0_riden2-firebase-adminsdk-fbsvc-*.json`

## Railway env vars — how to update via API
- Personal access token (from railway.app/account/tokens) needed — project token returns empty projects
- Use workspace query: `workspace(workspaceId: "dc1a0422-734f-42d1-ac6c-10add4ce24ca")` to find projects
- Project ID: `e916e467-180d-4769-9843-c59ff9514273`, Service ID: `3891db52-40c5-4414-a29f-f4ac0d19a57b`, Env ID: `627e6143-e716-437f-a205-a4843cf17882`
- Mutation: `variableCollectionUpsert` with projectId + serviceId + environmentId + variables map

## Railway deployment
- Railway auto-deploys from `https://github.com/ahmad1352733-cpu/Riden-backend.git` main branch
- Credentials now stored as Railway env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_ID

## Stale token cleanup
- When tokens are cleared from DB, apps re-register fresh FCM tokens on next foreground open
- AppState listener in usePushNotifications re-registers token on every app foreground
