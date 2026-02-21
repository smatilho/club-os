# ADR 0001: Tenant Isolation Model

- Status: accepted
- Date: 2026-02-20

## Context
Club OS serves many organizations and must prevent cross-tenant access while allowing multi-org users.

## Decision
Adopt strict organization-scoped tenancy:
- Core records include `organization_id`.
- Authorization and DB filtering enforce tenant boundaries.
- Platform-level operations require explicit platform scope.

## Consequences
- Safer default behavior for OSS adopters.
- Slight complexity in every query path.

## Alternatives Considered
- Schema-per-tenant: stronger isolation, higher operational complexity.
- Database-per-tenant: strongest isolation, harder OSS local setup.
