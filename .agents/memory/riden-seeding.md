---
name: RIDEN Seeding
description: How to seed the RIDEN database and why tsx scripts don't work at root level
---

## Working approach
Use psql directly: `psql "$DATABASE_URL" -c "..."` — this always works in the workspace.

## Demo credentials (seeded)
- Admin: admin@riden.jo / admin123, superadmin@riden.jo / admin123
- Passenger: ahmed@example.com / pass123
- Captain (approved): khaled@riden.jo / cap123
- Captain (pending): faris@riden.jo / cap123

## Why tsx at root fails
The scripts/ directory has no package.json, so tsx can't resolve drizzle-orm from workspace packages. `pnpm --filter @workspace/db exec tsx` also fails because tsx isn't a declared bin. Workaround: use psql directly.
