---
name: FCM Push Resolution
description: How push notifications were fixed in RIDEN — FCM v1 with google-auth-library
---

## Rule
Use `google-auth-library` (GoogleAuth class) for FCM v1 service account auth — never implement JWT manually.

**Why:** Manual JWT construction with `createSign` + Google OAuth2 token endpoint returns `unsupported_grant_type` even when the JWT structure looks correct. `google-auth-library` handles all edge cases (key parsing, token caching, refresh).

**How to apply:** In push.ts, import `GoogleAuth` from `google-auth-library`, pass `credentials: { client_email, private_key }` and `scopes: ["https://www.googleapis.com/auth/firebase.messaging"]`. Call `getClient().getAccessToken()` to get the bearer token.

## Other fixes
- push_token save: use raw `pool.query("UPDATE users SET push_token = $1 WHERE id = $2")` — Drizzle compiled schema in production was stale and silently skipped the field
- OTA must be published to `preview` branch (matches APK build profile channel), not `production`
- Mobile apps use `getDevicePushTokenAsync()` (raw FCM token) not `getExpoPushTokenAsync()` — Expo push service had InvalidCredentials for this project
- Admin broadcast: send one token per FCM request (loop), not batched
