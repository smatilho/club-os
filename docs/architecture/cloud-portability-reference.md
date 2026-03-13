# Cloud Portability Reference (AWS/GCP/Azure)

This reference maps Club OS portability contracts to provider capabilities.

## Capability Mapping

| Portability Capability | AWS Example | GCP Example | Azure Example |
| --- | --- | --- | --- |
| Container runtime | ECS/Fargate or EKS | Cloud Run or GKE | Container Apps or AKS |
| PostgreSQL | RDS PostgreSQL | Cloud SQL PostgreSQL | Azure Database for PostgreSQL |
| Object storage | S3 | Cloud Storage | Blob Storage |
| Queue/jobs | SQS + worker | Pub/Sub + worker | Service Bus + worker |
| Secret management | Secrets Manager | Secret Manager | Key Vault |
| Edge/TLS | ALB + ACM + Route53 | HTTPS LB + Certificate Manager + Cloud DNS | Front Door/App Gateway + Key Vault certs + Azure DNS |
| Observability | CloudWatch/X-Ray | Cloud Logging/Monitoring/Trace | Azure Monitor/App Insights |

## Adapter Boundary Rule
Provider SDKs are restricted to adapter/infrastructure paths only. Core domain/application code must only consume port interfaces.

Enforced by:
- `scripts/arch/check-boundary-imports.mjs`
- `scripts/arch/check-adapter-boundaries.mjs`

## Deployment Guidance
- Start with managed profile for fastest delivery.
- Move to cloud-portable profile when compliance/control requirements justify increased ops load.
- Keep tenancy/authz/policy logic invariant across providers.

## Non-Goals (Phase 5)
- No provider-specific IaC modules are shipped in this phase.
- No provider-exclusive features without neutral fallback behavior.
