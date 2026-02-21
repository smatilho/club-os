# ADR 0007: Private Mobile Pipeline Deferred Until Web/API Stability

- Status: accepted
- Date: 2026-02-20

## Context
Club OS needs to deliver web value quickly while preserving an option for tenant-specific mobile apps distributed under each tenant's developer accounts.

## Decision
- Defer direct mobile app implementation in the core roadmap.
- After web and API contracts stabilize, implement a white-label pipeline for tenant-owned iOS/Android apps.
- Keep signing, app-store credentials, and release ownership with tenant teams.

## Consequences
- Faster focus and execution on web-first platform quality.
- Reduced early maintenance burden for OSS maintainers.
- Mobile rollout timing depends on contract maturity and later investment.

## Alternatives Considered
- Build shared React Native app immediately.
- Build separate native iOS/Android apps immediately.
