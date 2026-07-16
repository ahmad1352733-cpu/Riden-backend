---
name: RIDEN Auth Flow
description: JWT auth details for RIDEN platform
---

## How it works
- Token signed with SESSION_SECRET env var (dev fallback: "riden-secret-dev")
- Token stored client-side in localStorage("riden_token")
- All frontends call setBaseUrl("/api") + setAuthTokenGetter(() => localStorage.getItem("riden_token")) in src/lib/api.ts

## Role assignment
- /api/auth/register/passenger → always creates role="passenger"
- /api/auth/register/captain → creates role="captain" + captains table row (approvalStatus="pending")
- Admin users: must UPDATE users SET role='admin' via psql after registering as passenger

**Why:** No admin self-registration endpoint by design (security). Admin is provisioned by ops team via DB.
