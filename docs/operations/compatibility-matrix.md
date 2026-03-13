# Compatibility Matrix (Phase 5 Baseline)

## Runtime Matrix

| Component | Managed Lean Profile | Self-Host Profile | Notes |
| --- | --- | --- | --- |
| Node.js | 22.x LTS | 22.x LTS | CI baseline and Docker images use Node 22. |
| Package Manager | pnpm 10.x | pnpm 10.x | Locked via `packageManager` in root `package.json`. |
| API Runtime | Hono + `tsx` | Hono + `tsx` | Self-host Docker baseline currently runs TS directly via `tsx`. |
| Web Runtime | Next.js 15 (App Router) | Next.js 15 standalone | Self-host uses Next standalone output. |
| Browser E2E | Chromium (full e2e) | Chromium/Firefox/WebKit smoke | Cross-browser visual smoke is CI-enforced. |

## Data/Infrastructure Matrix

| Capability | Managed Lean Reference | Self-Host Minimum |
| --- | --- | --- |
| Relational DB | Supabase Postgres | PostgreSQL 15+ |
| Object Storage | Supabase Storage | S3-compatible object storage |
| Queue/Async Jobs | Managed service adapter (deferred) | Redis/RabbitMQ/SQS-equivalent adapter (deferred) |
| TLS + Edge Routing | Vercel managed | Reverse proxy or ingress with TLS termination |
| Observability | Managed logs + metrics | Central logs + metrics + alerting stack |

## Browser Support Matrix (Smoke Coverage)

| Route Area | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| `/public` | yes | yes | yes |
| `/member` | yes | yes | yes |
| `/admin` | yes | yes | yes |

## Notes
- Full Playwright flow coverage currently runs on Chromium.
- Cross-browser suite is intentionally scoped to core route-area smoke + visual baseline.
- Future phases can expand full behavior e2e into Firefox/WebKit incrementally.
