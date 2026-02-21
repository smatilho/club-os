# Contributing to Club OS

## First Steps
1. Read `/docs/architecture/blueprint.md`.
2. Read ADRs in `/docs/adr/` (numeric order).
3. Read `/docs/implementation/claude-execution-checklist.md`.
4. Pick one phase-scoped issue.

## Development Rules
- Respect module boundaries and layering rules.
- Keep provider SDK usage in infrastructure adapters only.
- Keep tenant scoping explicit and testable.
- Do not introduce feature-specific terminology into core domain language.

## Pull Request Requirements
- Small, phase-aligned PR scope.
- Tests for changed behavior.
- Contract/migration notes for breaking changes.
- Docs/ADR updates for architecture-impacting changes.
- Output from `pnpm check`.

## Review Gates
- Architecture review and design review are required at each phase boundary.
- Deferred items must have tracking issues.

## Commit and Branching
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `docs/<short-description>`.
- Use conventional commit prefixes where practical (`feat:`, `fix:`, `docs:`, `chore:`).
