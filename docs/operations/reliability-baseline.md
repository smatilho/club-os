# Reliability Baseline (v1)

## Scope
Baseline operational expectations for clubs up to 1,000 members and small maintainer teams.

## Service Objectives
- API availability SLO: 99.5% monthly.
- Web availability SLO: 99.5% monthly.
- P95 API latency target: under 300ms for common reads.
- Background job success rate: 99% within retry policy.

## Recovery Targets
- RPO (data loss objective): 24 hours maximum.
- RTO (service restore objective): 8 hours maximum.
- Payment and reservation ledgers: target RPO under 1 hour where provider capabilities allow.

## Backups and Restore
- Daily automated Postgres backups.
- Point-in-time recovery where available.
- Quarterly restore drill required.
- Restore drill output must include:
  - backup timestamp used
  - restore duration
  - data integrity checks run

## Deployment Safety
- Required for production deployments:
  - schema migrations with rollback notes
  - health check canary
  - error budget check
- Rollback must be documented for each release affecting:
  - auth/session handling
  - reservations/payments
  - tenant isolation controls

## Incident Baseline
- Severity levels: `sev1`, `sev2`, `sev3`.
- `sev1` response target: acknowledge within 30 minutes.
- Post-incident summary required for `sev1` and `sev2` within 5 business days.

## Observability Minimum
- Structured logs with request id and organization id.
- Metrics:
  - request rate
  - error rate
  - latency
  - queue lag
- Alerting:
  - API 5xx rate threshold
  - auth failure anomaly
  - reservation/payment workflow failure threshold
