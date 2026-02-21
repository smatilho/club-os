# ADR 0004: Authorization Model (RBAC + Capabilities)

- Status: accepted
- Date: 2026-02-20

## Context
Need clear role defaults with extension safety across modules.

## Decision
Use role-based defaults mapped to granular capabilities.
- Roles assigned per organization.
- Policy checks evaluate capabilities, not role names.
- Management mutations require audit entries.

## Consequences
- Easier module extension and custom roles.
- Requires disciplined capability taxonomy.

## Alternatives Considered
- Role-name checks only: brittle and hard to evolve.
