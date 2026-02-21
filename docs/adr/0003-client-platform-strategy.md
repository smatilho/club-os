# ADR 0003: Client Platform Strategy

- Status: accepted
- Date: 2026-02-20

## Context
Need strong SEO and fast product iteration while keeping implementation complexity manageable for an OSS team.

## Decision
- Web: one Next.js application in v1 with route areas:
  - `/public/*`
  - `/member/*`
  - `/admin/*`
- Mobile app development is deferred until the web product and API contracts are stable.
- Future mobile strategy will prioritize a white-label/private app pipeline so each organization can ship apps with its own developer accounts, bundle ids, and release process.

## Consequences
- Better SEO/CMS flexibility for public site.
- Lower initial maintenance burden and faster path to production web release by avoiding multi-app web operational overhead.
- Mobile delivery timeline is delayed and depends on API stability milestones.

## Alternatives Considered
- Build React Native app now: broader platform reach earlier, but higher upfront complexity.
- Build separate native apps now: strongest platform UX, highest maintenance and staffing burden.
