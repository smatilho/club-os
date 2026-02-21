# Implementation Phase Plan

## Phase 0: Foundation
- Initialize one Next.js web app with route-area boundaries:
  - `/public/*`
  - `/member/*`
  - `/admin/*`
- Implement API skeleton with module registration.
- Add baseline auth and organization-scoped session model.
- Define provider-agnostic infrastructure interfaces (db, object storage, queue, auth claims).
- Add architecture guardrails in CI:
  - boundary-import checks (provider SDK leakage prevention)
  - module schema/contract checks
  - required OSS baseline file checks
- Add OSS baseline docs:
  - `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`
- Ship initial managed deployment profile (Vercel + Supabase).

## Phase 1: Identity + RBAC + Organization
- Implement users, memberships, organizations.
- Implement role assignment and capability checks.
- Add policy middleware and audit logging base.
- Implement policy decision contract and break-glass controls for privileged operations.

## Phase 2: Content + Public Area
- Implement content module with draft/publish flow.
- Build public site renderer under `/public/*` and CMS screens under `/admin/*`.
- Add tenant branding and theme token support.

## Phase 3: Reservations + Payments
- Implement inventory, hold, reservation lifecycle.
- Implement payment transaction abstraction.
- Build member booking UX under `/member/*` and management override tools under `/admin/*`.

## Phase 4: Community + Events
- Add posts, comments, event planning, moderation tools.
- Add notification channels.

## Phase 5: OSS Hardening
- Expand docs, examples, templates, and contribution pipeline.
- Add demo tenant seed and local e2e environment.
- Provide self-host baseline (`docker compose`) and cloud portability docs for AWS/GCP/Azure.
- Add adapter compliance checks to prevent provider-specific leakage outside infrastructure layers.
- Add release automation, compatibility matrix, and deprecation policy.

## Phase 6: Private Mobile App Pipeline (Optional)
- Define app-template contract driven by tenant config and module inventory.
- Generate organization-specific iOS/Android app configuration (bundle ids, app names, theme assets, API endpoints).
- Provide CI templates for tenant-owned signing and release flows (Apple/Google credentials managed by tenant teams).
- Keep mobile clients thin by consuming stable backend/API contracts from web-first platform.
