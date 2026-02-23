# Claude Code Handoff Guide

## Mission
Generate production-ready implementation from this blueprint while preserving:
- multi-tenant isolation
- modular boundaries
- MVVM client structure
- RBAC capability checks
- deployment portability across managed and self-host/cloud profiles

## Initial Build Order
1. Root tooling:
- workspace dependencies
- linting and formatting
- test harness
- architecture guardrails (boundary rules and provider-neutral checks)
- OSS baseline files and contribution workflow

2. API skeleton:
- module loader
- auth middleware
- policy engine interface
- audit logger interface

3. Unified web app:
- app shell and auth guards
- route conventions:
  - `/public/*`
  - `/member/*`
  - `/admin/*`
- UI kit integration
- web UI test baseline (`Vitest + React Testing Library`) and Playwright route smoke tests

4. Stabilization:
- harden API contracts used by all clients
- publish typed client SDK and API schema
- complete tenant configuration and module inventory flows
- expand UI/e2e coverage for cross-route regressions as modules land

5. Future mobile pipeline (deferred):
- design and implement private app generation/release flow per tenant
- keep signing credentials and release ownership with tenant teams

## Deployment Constraints
- Treat `Vercel + Supabase` as the reference managed profile, not a hard dependency.
- Keep cloud-specific logic inside infrastructure adapters.
- Do not place vendor SDK calls in domain or application layers.
- Ensure environment-driven configuration supports AWS/GCP/Azure-compatible replacements.
- Keep `apps/web` deployable as one unit by default; split only when operationally justified.

## Definition of Done for Early PRs
- Includes tests and type checks.
- Includes capability checks for privileged routes.
- Includes tenant-scoped query filters.
- Includes ADR or docs update if architecture changed.

## Review Cadence
- End of each implementation phase requires:
  - Architecture review (boundaries, portability, multi-tenant safety)
  - Design review (route placement, module fit, UX consistency)
- Do not begin next phase until review feedback is resolved or explicitly deferred with tracking issues.

Execution checklist:
- `/docs/implementation/claude-execution-checklist.md`
