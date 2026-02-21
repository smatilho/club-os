# ADR 0008: Deployment Profiles and Provider Portability

- Status: accepted
- Date: 2026-02-20

## Context
Club OS targets cost-sensitive organizations and volunteer-run teams. The project needs a low-effort default deployment while remaining deployable on traditional cloud infrastructure without managed-platform lock-in.

## Decision
- Adopt two supported deployment profiles:
  - Managed Lean profile (Vercel + Supabase) as the default path.
  - Cloud-portable/self-host profile for AWS/GCP/Azure or equivalent environments.
- Enforce provider neutrality in core architecture:
  - Domain/application layers are provider-agnostic.
  - Vendor integrations live behind infrastructure adapters.
- Maintain documentation and implementation guidance for both profiles.

## Consequences
- Faster onboarding path for small teams with managed defaults.
- Reduced risk of long-term vendor lock-in.
- Slightly higher implementation discipline needed to preserve adapter boundaries.

## Alternatives Considered
- Single managed-vendor strategy only: simpler initially but high lock-in risk.
- Self-host only from day one: maximum portability but higher operational burden for small teams.
