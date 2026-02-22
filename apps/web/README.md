# @club-os/web

Unified Next.js web application with three route areas.

## Route Areas

- `/public/*` — Public-facing marketing and membership funnel
- `/member/*` — Authenticated member workflows
- `/admin/*` — Management and administration

## Development

```bash
pnpm dev
```

## Architecture

Uses MVVM pattern with feature-level layering:
- `domain/` — entities, value objects, policies
- `application/` — use-cases, ports, orchestration
- `infrastructure/` — API clients, persistence adapters
- `presentation/` — View + ViewModel composition

Feature modules are added under `src/features/` in later phases.

See `/docs/architecture/web-route-map.md` for the full route map.
