# ADR 0006: MVVM Structure for Client Apps

- Status: accepted
- Date: 2026-02-20

## Context
Need maintainable frontend architecture for web-first delivery with future extension to mobile clients.

## Decision
Adopt MVVM with feature-level layering:
- `domain`
- `application`
- `infrastructure`
- `presentation`

## Consequences
- Cleaner testability and onboarding.
- Requires lint/import rules to prevent boundary violations.

## Alternatives Considered
- UI-driven architecture with service calls in components: faster initially, poor maintainability.
