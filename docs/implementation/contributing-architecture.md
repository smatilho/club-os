# Architecture Contribution Rules

## Boundary Rules
- Do not import infra adapters into domain.
- Do not bypass application services from UI.
- Do not query another module tables directly.
- Provider SDK imports are allowed only in `infrastructure` paths.
- Files outside `infrastructure` paths (including unlayered source files) must not import provider SDKs.

## PR Checklist
- Added or updated tests.
- Added migration notes for contract changes.
- Verified tenant isolation assumptions.
- Verified authz checks at API boundary.
- Verified route placement under `/public`, `/member`, or `/admin` for web changes.
- If phase boundary reached, completed architecture and design review checklist.

## Naming
- Use `organization` over `club` in core domain.
- Use `resource unit` for reservable items.
- Keep activity-specific terms in module-level labels only.
