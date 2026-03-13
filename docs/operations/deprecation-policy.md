# Deprecation Policy

## Scope
Applies to:
- API contracts
- module manifests/capabilities
- environment variables
- web route-area behavior relied on by integrators

## Deprecation Lifecycle

## 1. Announce
Deprecations must be announced in:
- `CHANGELOG.md` under an explicit `Deprecated` section
- release notes
- affected docs in `docs/contracts` or `docs/architecture`

## 2. Mark
Deprecated fields/routes/flags must be marked with:
- replacement guidance
- target removal version or date
- compatibility behavior during overlap window

## 3. Overlap Window
- Minimum overlap window: one minor release for non-critical changes.
- Security-critical removals may be accelerated with explicit justification.

## 4. Remove
Removal requires:
- changelog `Removed` entry
- migration instructions
- updated compatibility matrix

## API Deprecation Rules
- Do not silently repurpose existing fields.
- Prefer additive replacements before removal.
- Return structured `{ error, reasonCode }` for removed behavior with docs reference where possible.

## Environment Variable Deprecation Rules
- Keep legacy variable support for at least one minor release unless security issue exists.
- Log a startup warning when deprecated env keys are detected.

## Contributor Requirements
Any PR introducing or removing deprecated behavior must include:
- contract impact summary
- migration path
- test updates for both old/new behavior during overlap window
