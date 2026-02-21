# ADR 0002: Modular Monolith First

- Status: accepted
- Date: 2026-02-20

## Context
Project needs fast iteration and manageable complexity while staying extensible.

## Decision
Implement backend as a modular monolith with explicit module contracts and event boundaries.

## Consequences
- Faster delivery and simpler deployment early.
- Future extraction to services is possible if boundaries are respected.

## Alternatives Considered
- Microservices from day one: higher operational burden.
