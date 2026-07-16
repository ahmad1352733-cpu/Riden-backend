---
name: RIDEN Architecture
description: Full-stack ride-hailing platform structure, key decisions, and file layout
---

## Structure
- `artifacts/api-server` — Express API, port from PORT env, routes at /api/*
- `artifacts/riden-passenger` — Passenger app, previewPath `/`, wouter base=BASE_URL
- `artifacts/riden-captain` — Captain app, previewPath `/captain/`
- `artifacts/riden-admin` — Admin panel, previewPath `/admin/`
- `lib/db` — Drizzle ORM + PostgreSQL, schema in `src/schema/`
- `lib/api-client-react` — generated React Query hooks (orval)
- `lib/api-zod` — generated Zod schemas (orval)
- `lib/api-spec/openapi.yaml` — source of truth for API spec

## Key decisions
- Fare: first 2km = 1 JOD fixed; after: +0.25 JOD/km + 0.05 JOD/min
- 10% commission deducted from captain earnings per trip
- JWT auth: SESSION_SECRET env var (falls back to "riden-secret-dev")
- All frontends: setBaseUrl("/api") + setAuthTokenGetter from localStorage "riden_token"
- Admin role: must be set via psql (no admin registration endpoint)

**Why:** OpenAPI spec uses entity-shaped schema names to avoid TS2308 collisions. format:email removed from spec to avoid Zod v4 conflict.
