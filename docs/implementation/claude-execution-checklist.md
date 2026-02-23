# Claude Execution Checklist

Use this checklist to implement Club OS in review-gated phases.

## Operating Rules
- Build in phase order only.
- Open a PR per phase or sub-phase.
- Include architecture and design review notes in every phase PR.
- Do not start the next phase until review gate is approved or deferrals are explicitly tracked.

## Phase 0: Foundation
Implementation goals:
- Set up `apps/web` (single app) with route areas:
  - `/public/*`
  - `/member/*`
  - `/admin/*`
- Set up `services/api` modular monolith skeleton.
- Add baseline auth/session context with `organization_id`.
- Add architecture guard scripts:
  - provider SDK boundary checks
  - manifest/schema checks
  - required OSS file checks
- Ensure OSS baseline docs exist in repo root.

Required artifacts:
- Web route map doc.
- API module skeleton with at least one example module.
- CI green on `pnpm check`.

Review gate:
- Architecture review:
  - boundaries match blueprint
  - portability rules enforced
- Design review:
  - route-area information architecture is coherent
  - navigation model supports public/member/admin separation

## Phase 1: Identity + RBAC + Organization
Implementation goals:
- Users, organizations, memberships, role assignments.
- Capability-based policy checks at API boundary.
- Policy decision contract from `/docs/security/policy-engine-contract.md`.
- Baseline audit log writer for privileged actions.

Required artifacts:
- RBAC seed roles + capability mappings.
- Policy decision tests.
- Tenant isolation tests for identity queries.
- `apps/web` route layout/page tests via `Vitest + React Testing Library`.
- Playwright route-area auth-guard smoke tests for `/public`, `/member`, `/admin`.

Review gate:
- Architecture review:
  - no role-name-only checks in business logic
  - policy engine reason codes used consistently
- Design review:
  - role management UX flows mapped to `/admin/*`

## Phase 2: Content + Public Area
Implementation goals:
- Content module with draft/publish lifecycle.
- Public page rendering under `/public/*`.
- Admin CMS screens under `/admin/*`.
- Tenant branding/theme tokens.

Required artifacts:
- Content schema and publish workflow tests.
- Public caching/invalidations documented.
- Component and page tests for content admin/public render states.
- Playwright publish/navigation regression coverage for content flows.

Review gate:
- Architecture review:
  - content contracts versioned
  - tenant separation preserved in content queries
- Design review:
  - public-site customization UX is clear for non-technical admins

## Phase 3: Reservations + Payments
Implementation goals:
- Inventory, hold, reservation lifecycle.
- Payment abstraction with idempotent workflows.
- Booking UX under `/member/*`; override tooling under `/admin/*`.

Required artifacts:
- Reservation state-machine tests.
- Payment idempotency tests.
- Failure handling matrix (timeout, duplicate webhook, partial failure).
- Playwright booking + admin override end-to-end scenarios.

Review gate:
- Architecture review:
  - booking/payment contracts are stable and versioned
  - audit coverage for overrides and refunds
- Design review:
  - booking UX supports configured booking modes without confusion

## Phase 4: Community + Events
Implementation goals:
- Posts, comments, event planning, moderation.
- Notification channel abstraction.

Required artifacts:
- Moderation policy checks.
- Abuse/report handling workflow.
- Moderation UI regression tests and Playwright moderation flow coverage.

Review gate:
- Architecture review:
  - moderation actions audited
  - feature flags align with module inventory
- Design review:
  - community UX boundaries between member/admin are explicit

## Phase 5: OSS Hardening + Portability
Implementation goals:
- Example tenant seed + local e2e environment.
- `docker compose` self-host baseline.
- Cloud-portable deployment references for AWS/GCP/Azure.
- Adapter compliance checks and release/deprecation policy.

Required artifacts:
- Self-host runbook.
- Upgrade/migration guide.
- Compatibility matrix by deployment profile.
- Visual regression or screenshot-baseline coverage for core web route areas.

Review gate:
- Architecture review:
  - no vendor lock-in leakage
  - adapter contracts tested
- Design review:
  - setup docs are clear for first-time OSS adopters

## Phase 6: Private Mobile Pipeline (Optional)
Implementation goals:
- Tenant-config-driven iOS/Android template generation.
- Tenant-owned signing and release CI templates.

Required artifacts:
- App config schema validator.
- Generated project smoke tests.

Review gate:
- Architecture review:
  - mobile pipeline consumes stable API contracts
  - no tenant secrets in core OSS repo
- Design review:
  - branding and environment config flow is understandable

## Mandatory CI/Quality Commands
- `pnpm check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## UI Test Commands (incremental rollout)
- `pnpm --filter @club-os/web test` (Vitest + React Testing Library)
- `pnpm test:web:e2e` (Playwright route-area/browser flows; CI smoke job runs non-blocking during rollout)
- `pnpm test:web:e2e:install` (install Playwright browser runtime locally/CI)

## Phase Completion Template
Include this in each phase PR:
1. Scope completed.
2. Contracts changed (if any).
3. Risks and mitigations.
4. Architecture review notes.
5. Design review notes.
6. Deferred items with tracking issue ids.
