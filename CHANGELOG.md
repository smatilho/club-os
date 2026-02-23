# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source foundation for Club OS.
- Architecture blueprint and ADR set for:
  - multi-tenant model
  - modular monolith first
  - unified web app route areas (`/public`, `/member`, `/admin`)
  - RBAC and capability-based authorization
  - deployment portability (managed + self-host/cloud profiles)
- Module manifest and contract docs for feature inventory and extension boundaries.
- Security and operations baselines:
  - policy engine contract
  - RBAC matrix
  - reliability baseline (SLO/RTO/RPO targets)
- Contribution and project policies:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `LICENSE`
- CI and architecture guardrails:
  - required baseline file checks
  - placeholder script checks
  - provider-SDK boundary checks (allowed only in `infrastructure`)
  - schema and documentation consistency tests

### Phase 0 — Foundation
- `apps/web`: Next.js App Router with `/public`, `/member`, `/admin` route areas and per-area layouts.
- `services/api`: Hono-based modular monolith skeleton with module loader, health module, and request context.
- Platform abstraction ports: `DatabasePort`, `ObjectStoragePort`, `QueuePort`, `AuthClaimsPort`, `ObservabilityPort`.
- `packages/domain-core`: `Result<T,E>` type, branded IDs (`OrgId`, `UserId`, `MembershipId`).
- `packages/auth-rbac`: policy engine types and `evaluatePolicy` matching `policy-engine-contract.md`, `SessionContext`.
- `packages/module-registry`: full-schema `validateModuleManifest`, `ModuleRegistry` class.
- TypeScript typechecking enabled across all packages and services.
- Vitest unit tests for domain-core, auth-rbac, module-registry, and API health endpoint (28 tests).
- Web route map doc (`docs/architecture/web-route-map.md`).

### Phase 1 — Identity + RBAC + Organization
- `packages/domain-core`: `User`, `Membership`, `RoleAssignment` entities with branded IDs and `MembershipStatus`.
- `packages/auth-rbac`: RBAC seed role → capability mappings per RBAC matrix v1 (`ROLE_CAPABILITY_MAP`).
  - `resolveCapabilities(roles)` deduplicates capabilities from multiple assigned roles.
  - `AuditEntry` type and `AuditWriter` port interface for privileged action logging.
  - `InMemoryAuditWriter` for development and testing.
- `services/api`: Auth and policy middleware.
  - `authMiddleware`: production-safe bearer-token entrypoint (real token verification via `AuthClaimsPort` in later phase).
  - `mockAuthMiddleware`: separate local/test-only mock header session extraction with Bearer precedence over mock headers.
  - `requireCapability(cap, resourceType)`: policy-enforcing middleware using `evaluatePolicy`, writes audit entries.
  - `requireCapability(..., { extractResource })`: supports resource organization resolution so tenant-mismatch denies are policy-evaluated and audited centrally.
  - Identity module (`/api/identity/*`): organization read, membership CRUD, role assignment/removal.
  - Runtime request validation for identity membership/role payloads (rejects invalid role values and malformed JSON).
  - Tenant isolation enforced at service and policy middleware layers (with tenant-mismatch deny auditing).
- `apps/web`: Auth enforcement on route area layouts.
  - `/member/*` layout: redirects unauthenticated users to `/public`.
  - `/admin/*` layout: redirects users without management capability to `/member`, unauthenticated to `/public`.
  - Server-side `getSession()` reads mock session from cookie (UX guard only; API enforces authz).
- Web UI testing baseline:
  - `apps/web` now runs `Vitest + React Testing Library` (route pages/layout guards).
  - Root Playwright config + route-area auth-guard smoke specs (`pnpm test:web:e2e`).
  - GitHub Actions Playwright smoke job added (non-blocking rollout, uploads artifacts on failure).
- Tests: 100 total in `pnpm check` (7 web, 22 auth-rbac, 2 domain-core, 16 module-registry, 45 API, 8 CI guards).
  - RBAC seed mapping tests (11 tests across all 6 roles).
  - Audit writer tests (4 tests).
  - Auth middleware tests (5 tests).
  - Policy middleware tests (8 tests including audit logging).
  - Identity service tests (15 tests including tenant isolation).
  - Identity route tests (11 tests: auth, authz, audit logging, tenant role validation).
  - Web route/page tests (7 tests via Vitest + React Testing Library).
