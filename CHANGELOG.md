# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Open-source project foundation and governance baseline:
  - `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`
  - architecture blueprint and ADR set
  - security and reliability baseline docs
- Core CI/architecture guardrails:
  - required-file checks
  - placeholder-script checks
  - module manifest/schema checks
  - provider import boundary checks
  - adapter boundary checks
- Unified web route-area architecture:
  - `/public/*`, `/member/*`, `/admin/*`
  - route-area guards and baseline layouts
- Modular API foundation with module loader and health endpoint.
- Shared platform contracts and packages:
  - `@club-os/domain-core`
  - `@club-os/auth-rbac`
  - `@club-os/module-registry`
  - `@club-os/ui-kit`
- Identity + RBAC + policy enforcement baseline:
  - organizations, memberships, role assignment
  - capability mapping and policy middleware
  - audit writer baseline
- Content CMS + public rendering:
  - draft/publish lifecycle
  - public published-page API
  - admin content authoring routes/pages
- Org branding/theme module and public theme endpoint.
- Reservations + payments:
  - inventory/holds/reservations state lifecycle
  - payment provider abstraction and fake provider
  - webhooks, refunds, idempotent workflows
  - member/admin reservation and payment UI paths
- Community + events + notifications modules:
  - posts/comments/reports/moderation
  - event lifecycle + RSVP/waitlist
  - in-app/email notification dispatch and read-state
- CMS productization + UX integration:
  - menu/navigation domain and admin navigation management UI
  - idempotent default public site seeding (Home/About/Contact)
  - `/public` homepage resolution from seeded CMS content
  - block-based page model (`blocks_v1`) and block registry
  - page templates and block editor UX improvements
  - unified public/member/admin shells driven by menu data
- Phase 5 hardening baseline:
  - self-host runtime artifacts (`docker-compose.yml`, Dockerfiles, `.env.example`)
  - cross-browser visual smoke suite and snapshot baselines
  - release workflow (`.github/workflows/release.yml`)
  - demo tenant bootstrap script (`pnpm seed:demo-tenant`)
  - operations docs:
    - `docs/operations/self-host-runbook.md`
    - `docs/operations/compatibility-matrix.md`
    - `docs/operations/upgrade-and-migration.md`
    - `docs/operations/deprecation-policy.md`
    - `docs/operations/release-process.md`
    - `docs/architecture/cloud-portability-reference.md`

### Changed
- README updated to reflect current implementation maturity and Phase 5 baseline workflows.
- CI workflow expanded with cross-browser visual smoke job.
- Next.js web runtime configured for standalone output to support self-host containers.
- API runtime bootstrap now reads validated environment config (`PORT`, `CLUB_OS_DEFAULT_ORG_ID`, `CLUB_OS_AUTO_SEED`).
- Deployment profile docs updated with direct links to self-host, compatibility, release, and migration docs.
- Web and API route maps, feature inventory, and architecture docs expanded as modules shipped.

### Fixed
- Multiple CI pipeline stabilization fixes across validation and e2e flows.
- Hardened content auth behavior, slug publishing behavior, and CMS proxy interactions.
- Playwright e2e reliability fixes for seeded-site/navigation and content publish flows.
- Boundary guard coverage strengthened to prevent provider/adapters leakage outside intended layers.
