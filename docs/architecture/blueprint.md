# Club OS Blueprint

## 1. Scope
Club OS is a generalized, multi-tenant platform for membership organizations with facilities/resources and operational teams.

Primary areas:
- Public
- Member
- Management

## 2. Bounded Contexts
- Identity and Access: users, memberships, roles, permissions, sessions.
- Organization Setup: club profile, branding, locales, policy defaults.
- Content: pages, media, navigation, announcement channels.
- Reservations: inventory, availability, holds, bookings, cancellations.
- Finance: dues, invoices, payments, refunds, reporting aggregates.
- Community: events, posts, comments, messaging.
- Operations: admin tasks, audits, support workflows.

## 3. Modular Monolith Baseline
Start as one deployable backend with strict internal module boundaries.

Rules:
- No direct cross-module DB reads.
- Cross-module interaction via explicit application services/events.
- Public interfaces per module documented and tested.
- Shared kernel limited to primitives (ids, money, dates, result types).

## 4. MVVM Conventions
Applies to the unified web client in the initial release and to future mobile clients.

Feature folder contract:
- `domain/`: entities, value objects, policies.
- `application/`: use-cases, ports, orchestration.
- `infrastructure/`: api clients, persistence adapters.
- `presentation/`: View + ViewModel composition.

Constraints:
- ViewModel may call application layer only.
- View must not call infrastructure directly.
- Domain must not import framework UI packages.

## 5. Data/Tenancy
- Every protected record has `organization_id`.
- Row-level authorization enforced in service layer and DB policy layer.
- User can belong to multiple organizations with scoped roles.

## 6. Feature Inventory
Each tenant has a feature inventory that controls module activation and mode:
- Example: reservations enabled with `booking_mode=bed_selection`.

Feature inventory definitions live in module manifests validated by schema:
- `/docs/contracts/module-manifest.schema.json`

## 7. Deployment Topology (Initial)
- Unified web app (SSR/SSG capable) with route areas:
  - `/public/*`
  - `/member/*`
  - `/admin/*`
- API service.
- Database + object storage + queue.

## 8. Deployment Profiles
Two first-class deployment profiles are supported:

- Managed profile (default for low-maintenance teams):
  - Next.js apps on Vercel
  - Postgres/Auth/Storage on Supabase
  - Best for fast launch and low operational overhead

- Cloud-portable/self-host profile (AWS/GCP/Azure/etc):
  - Containerized API + web workloads
  - Managed or self-managed Postgres
  - Object storage and queue selected per cloud
  - Best for organizations requiring full infrastructure control

Portability rule:
- Domain and application layers must not depend directly on vendor-specific SDKs.
- Provider-specific integrations are isolated in infrastructure adapters.
- Required platform ports are defined in `/docs/contracts/platform-abstractions.md`.

Detailed spec:
- `/docs/architecture/deployment-profiles.md`

## 9. Future Mobile Distribution Pipeline (Deferred)
- Goal: let each organization optionally ship private iOS/Android apps for members.
- Ownership model: each organization uses its own Apple/Google developer accounts, bundle ids, and signing credentials.
- Inputs: tenant branding, enabled modules, auth config, API base URLs, app policy settings.
- Output: organization-specific app builds and release artifacts.
- Security constraint: signing secrets must remain in tenant-owned CI/workspace, never in the OSS repo.
- Detailed spec: `/docs/architecture/mobile-distribution-pipeline.md`.

## 10. Non-Functional Targets
- P95 API latency under 300ms for common reads.
- Full audit trail for management mutations.
- Tenant data isolation test suite required.
- Idempotent payment and booking workflows.
- Defined reliability targets (RTO/RPO), backup/restore drills, and rollback strategy.
- Baseline SLO/SLI definitions and alerting thresholds.

Operational baseline:
- `/docs/operations/reliability-baseline.md`

## 11. Open Source Requirements
- Contributor guide and coding standards.
- License, security policy, and support policy docs in repo root.
- ADR-driven architecture decisions.
- Contract tests for module interfaces.
- Sample seed dataset for local development.
