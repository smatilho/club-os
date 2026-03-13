# Upgrade and Migration Guide

This guide defines the minimum upgrade workflow for Club OS adopters.

## Versioning Baseline
- Club OS is pre-1.0. Breaking changes may occur between minor releases.
- Every release must include:
  - changelog entries
  - migration notes for contract/schema changes
  - rollback notes for high-risk surfaces

## Upgrade Workflow

## 1. Read Release Notes
Review:
- `CHANGELOG.md`
- compatibility changes in `/docs/operations/compatibility-matrix.md`
- deprecations in `/docs/operations/deprecation-policy.md`

## 2. Run Pre-Upgrade Checks
From your target revision:
```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
```

## 3. Apply Configuration Changes
Update environment variables using:
- `.env.example`
- release notes (if new vars were introduced)

## 4. Apply Data Migrations
When persistence adapters are enabled for your deployment:
- apply schema migrations before app rollout
- validate migration completion before traffic cutover

## 5. Validate Critical Paths
At minimum validate:
- `/public`, `/member`, `/admin` route area availability
- content publish flow
- reservation + payment happy path
- admin moderation/report workflow

## 6. Rollback Plan
Document rollback for each release that changes:
- auth/session behavior
- policy/rbac evaluation
- reservation/payment state logic
- tenant resolution behavior

## Migration Note Template
Use this template in release PRs:
```markdown
### Migration Notes
- Change type: [breaking | additive | patch]
- Affected modules/contracts:
- Required operator action:
- Backfill needed: [yes/no]
- Rollback approach:
```
