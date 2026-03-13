# Self-Host Runbook (Docker Compose Baseline)

This runbook is the Phase 5 baseline for running Club OS end-to-end with Docker.

## Scope
- Starts API + web app with `docker compose`.
- Uses environment-driven default tenant seed behavior.
- Supports local demo-tenant bootstrap for UI walkthroughs.

## Prerequisites
- Docker Desktop or Docker Engine + Compose plugin.
- 4+ GB RAM available to Docker.
- Ports `3100` and `4100` available.

## 1. Configure Environment
```bash
cd /path/to/club-os
cp .env.example .env
```

Optional overrides in `.env`:
- `CLUB_OS_WEB_PORT`
- `CLUB_OS_API_PORT`
- `CLUB_OS_DEFAULT_ORG_ID`
- `CLUB_OS_AUTO_SEED`

## 2. Start Services
```bash
docker compose up --build -d
```

## 3. Verify Health
```bash
curl http://127.0.0.1:4100/api/health
```

Expected response:
```json
{"status":"ok"}
```

## 4. Open Route Areas
- Public: `http://127.0.0.1:3100/public`
- Member: `http://127.0.0.1:3100/member`
- Admin: `http://127.0.0.1:3100/admin`

## 5. Seed Demo Tenant (Optional)
The default org (`org-default`) auto-seeds on startup. For additional tenant demos:

```bash
CLUB_OS_API_BASE_URL=http://127.0.0.1:4100 \
CLUB_OS_DEMO_ORG_ID=org-demo \
corepack pnpm seed:demo-tenant
```

This seeds:
- Home/About/Contact CMS pages (published)
- navigation menu links
- a baseline theme for the demo org

## 6. Run Cross-Browser Visual Smoke Locally
```bash
corepack pnpm test:web:e2e:smoke
```

If you intentionally changed visuals, regenerate baseline snapshots:
```bash
corepack pnpm test:web:e2e:smoke:update
```

## 7. Shutdown
```bash
docker compose down
```

Remove volumes/images if needed:
```bash
docker compose down --volumes --rmi local
```
