# club-os

Open source, multi-tenant Club OS blueprint.

This repository is an architecture-first starter for building a generalized club platform with three primary product areas:
- Public area: marketing, history, membership funnel, static and campaign content.
- Member area: dues, reservations, social feed, events, account management.
- Management area: CMS, financial operations, reservation operations, and administrative controls.

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

## Deployment Philosophy
- Cost-efficient default: managed deployment profile for small teams.
- Provider portability: no hard lock-in to any managed platform.
- Self-host support: deployable on AWS, GCP, Azure, or equivalent infrastructure.

See deployment profiles:
- `/docs/architecture/deployment-profiles.md`

## Quick Start (Blueprint Stage)
1. Read `/docs/architecture/blueprint.md`.
2. Read ADRs in `/docs/adr/` in numeric order.
3. Start implementation from `/docs/implementation/phase-plan.md`.
4. Use `/docs/implementation/claude-execution-checklist.md` for phased implementation with architecture/design review gates.
5. Use `/docs/contracts/module-manifest.schema.json` to onboard new modules.
6. Choose a deployment profile in `/docs/architecture/deployment-profiles.md`.

## Repository Layout
- `/apps/web`: unified web experience with `/public`, `/member`, and `/admin` route areas.
- `/apps/mobile`: reserved for future mobile clients and generated app templates.
- `/services/api`: Club OS backend (modular monolith).
- `/packages/domain-core`: shared domain entities and value objects.
- `/packages/auth-rbac`: authorization contracts, policy checks, and capability helpers.
- `/packages/module-registry`: module manifest parser/validator and runtime registry.
- `/packages/ui-kit`: shared design system primitives.

## Open Source Governance
- `LICENSE`: open source license.
- `CONTRIBUTING.md`: contribution workflow and quality expectations.
- `SECURITY.md`: vulnerability reporting and response policy.
- `SUPPORT.md`: support expectations and channels.

## Current Status
- Blueprint and architecture docs ready.
- Starter folder structure committed.
- Web-first implementation path defined.
- Deployment strategy defined for both managed and self-host/cloud-portable modes.
- Implementation intentionally minimal so automation agents can generate production code against documented contracts.
- CI includes architecture guardrails for boundary rules and blueprint integrity.
