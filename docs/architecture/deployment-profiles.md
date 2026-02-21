# Deployment Profiles

Club OS supports two deployment profiles from day one. The project is intentionally not tied to a single hosting vendor.

## Profile A: Managed Lean (Default)
Best for one maintainer or a very small team focused on speed and low ops overhead.

Reference stack:
- Unified web app (`apps/web`): Vercel
- Data/Auth/Storage: Supabase

Why this profile exists:
- Fastest time to production
- Low maintenance burden
- Predictable baseline cost for small clubs

## Profile B: Cloud-Portable / Self-Hosted
Best for organizations that require infrastructure control, existing cloud standards, or vendor-neutral operations.

Supported target environments:
- AWS
- GCP
- Azure
- Equivalent self-hosted infrastructure

Required platform capabilities (provider-neutral):
- Container runtime for API and web workloads
- PostgreSQL
- Object storage
- Queue/background job execution
- Secret management
- TLS termination and domain routing
- Observability (logs, metrics, traces)

## Portability Contract
- Domain and application code must be provider-agnostic.
- Vendor SDK usage is restricted to infrastructure adapters.
- Environment configuration must be externalized and validated on startup.
- Data access goes through repository/port abstractions.
- Background job interfaces must support multiple adapter implementations.

## Implementation Guidance
- Keep a managed baseline deployment path documented and tested.
- Ship a self-host baseline with Docker Compose for local/proof environments.
- Add IaC reference modules over time for AWS/GCP/Azure.
- Avoid vendor-only features unless an equivalent fallback exists.
