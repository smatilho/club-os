# club-os

Open source, multi-tenant Club OS blueprint and modular monolith starter.

This repository is an architecture-first starter for building a generalized club platform with three primary product areas:
- Public area: marketing, history, membership funnel, static and campaign content.
- Member area: dues, reservations, social feed, events, account management.
- Management area: CMS, financial operations, reservation operations, and administrative controls.

## Status (Phases 0-3)
- Phase 0: architecture/docs foundation and monorepo scaffolding complete.
- Phase 1: identity, RBAC/capability policy enforcement, audit wiring, and admin/member/public route guards complete.
- Phase 2: content CMS + public content rendering + tenant branding/theme complete.
- Phase 3: reservations + payments (fake provider/idempotent workflow) + member/admin booking/payment UX complete.

This is now a runnable web/API starter with in-memory services and a fake payment provider for development/testing.

## Product Principles
- Activity-agnostic: supports any club activity, not ski-specific.
- Tenant-first: every critical domain object is organization-scoped.
- Modular by default: feature modules can be enabled, disabled, and extended.
- Secure by design: RBAC, auditability, and policy checks at API boundaries.
- OSS-friendly: clear contracts, good docs, and low contributor friction.

## Architecture Snapshot
- Monorepo: `apps/*`, `services/*`, `packages/*`.
- Backend: modular monolith first, with clean seams for future extraction.
- Frontend: one Next.js web app (`apps/web`) with route areas:
  - `/public/*` for marketing and acquisition.
  - `/member/*` for authenticated member workflows.
  - `/admin/*` for management operations.
- Mobile: deferred; planned white-label/private app pipeline after web/API maturity.
- UI pattern: MVVM with strict separation of presentation, application, and domain logic.

### Implemented API Modules (Current)
- `identity`: users, organizations, memberships, tenant-scoped roles.
- `content`: draft/publish CMS pages with published snapshot serving.
- `org-profile`: tenant branding/theme settings.
- `reservations`: inventory, holds, availability, reservation lifecycle, admin overrides.
- `payments`: provider abstraction, fake provider, webhooks, refunds, idempotent transaction workflows.

### Implemented Web Areas (Current)
- `/public/*`: landing page + published content pages + tenant branding tokens.
- `/member/*`: reservation list, booking flow, reservation detail/status.
- `/admin/*`: content CMS, branding settings, reservation ops, payment ops.

## Deployment Philosophy
- Cost-efficient default: managed deployment profile for small teams.
- Provider portability: no hard lock-in to any managed platform.
- Self-host support: deployable on AWS, GCP, Azure, or equivalent infrastructure.

See deployment profiles:
- `/docs/architecture/deployment-profiles.md`

## Quick Start (Local Development)
1. Install dependencies:
   - `corepack pnpm install`
2. Start API (Terminal A):
   - `cd services/api && PORT=4100 corepack pnpm dev`
3. Start web app (Terminal B):
   - `cd apps/web && CLUB_OS_API_BASE_URL=http://127.0.0.1:4100 corepack pnpm dev -- --hostname 127.0.0.1 --port 3100`
4. Open:
   - `http://127.0.0.1:3100/public`
   - `http://127.0.0.1:3100/member`
   - `http://127.0.0.1:3100/admin`

Notes:
- Admin/member API actions use mock-session forwarding in local/dev and Playwright tests.
- Public content and theme tenant resolution currently uses a documented dev default org strategy (see docs).

## Verification / Test Commands
- Full repo checks: `corepack pnpm check`
- Web E2E (Playwright): `corepack pnpm test:web:e2e`
- Install Playwright browser (first time): `corepack pnpm test:web:e2e:install`

### Test Stack (Current)
- Unit/integration: `Vitest` (API + packages + web)
- Web UI behavior: `Vitest` + `React Testing Library`
- Browser E2E: `Playwright` (route guards, CMS/public flows, reservation/payment flows)
- CI: validate job + non-blocking `web-e2e-smoke` Playwright job

## Implementation Docs (Start Here for Architecture/Contrib)
1. `/docs/architecture/blueprint.md`
2. `/docs/adr/README.md` and ADRs in numeric order
3. `/docs/implementation/phase-plan.md`
4. `/docs/implementation/claude-execution-checklist.md`
5. `/docs/contracts/module-manifest.schema.json` (for new modules/manifests)
6. `/docs/architecture/web-route-map.md`
7. `/docs/architecture/feature-inventory.md`

## Repository Layout
- `/apps/web`: unified web experience with `/public`, `/member`, and `/admin` route areas.
- `/apps/mobile`: reserved for future mobile clients and generated app templates.
- `/services/api`: Club OS backend (modular monolith).
- `/packages/domain-core`: shared domain entities and value objects.
- `/packages/auth-rbac`: authorization contracts, policy checks, and capability helpers.
- `/packages/module-registry`: module manifest parser/validator and runtime registry.
- `/packages/ui-kit`: shared design system primitives.

## Current Constraints / Deferred Work
- Persistence is in-memory for major modules (content, org profile, reservations, payments).
- Payments use a fake provider adapter and dev/test webhook simulation endpoints.
- Public-side caching is correctness-first (`no-store` baseline) with optimization deferred.
- Public tenant resolution is a development default-org strategy; host/subdomain resolution is deferred.
- Mobile app implementation remains deferred.

## Open Source Governance
- `LICENSE`: open source license.
- `CONTRIBUTING.md`: contribution workflow and quality expectations.
- `SECURITY.md`: vulnerability reporting and response policy.
- `SUPPORT.md`: support expectations and channels.

## Current Status
- Runnable web + API baseline implemented through Phase 3.
- Capability-based policy enforcement and audit logging are active at API boundaries.
- Module manifests and feature inventory are in place for implemented backend modules.
- Public content/CMS + branding/theme + reservations/payments flows are covered by unit/integration tests.
- CI includes architecture guardrails, repo checks, and Playwright smoke coverage.
