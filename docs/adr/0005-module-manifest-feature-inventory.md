# ADR 0005: Module Manifest and Feature Inventory

- Status: accepted
- Date: 2026-02-20

## Context
Different clubs need different feature sets and booking modes.

## Decision
Each module ships a machine-readable manifest describing routes, capabilities, config schema, and dependencies.
Tenant feature inventory is derived from enabled modules + module config.

## Consequences
- Predictable plugin/module lifecycle.
- Better admin UX for feature toggling.

## Alternatives Considered
- Ad hoc environment flags: hard to govern and test.
