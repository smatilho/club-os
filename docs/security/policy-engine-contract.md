# Policy Engine Contract v1

## Purpose
Define a stable authorization decision contract that every privileged API path uses.

## Decision Request Shape
- `actor`: normalized identity (`userId`, `organizationId`, assigned roles)
- `action`: capability string (for example: `reservation.override`)
- `resource`: target descriptor (`type`, `id`, `organizationId`)
- `context`: request metadata (route, request id, ip hash, user agent hash, timestamp)

## Decision Response Shape
- `effect`: `allow` | `deny`
- `reasonCode`: stable machine-readable reason
- `obligations` (optional):
  - `requireAudit: boolean`
  - `redactFields: string[]`
  - `ttlSeconds` (for temporary elevation)

## Reason Codes (Initial)
- `ALLOW_ROLE_CAPABILITY`
- `DENY_CAPABILITY_MISSING`
- `DENY_SCOPE_MISMATCH`
- `DENY_RESOURCE_TENANT_MISMATCH`
- `DENY_BREAK_GLASS_EXPIRED`
- `DENY_POLICY_CONDITION_FAILED`

## Break-Glass Contract
- Inputs must include:
  - `ticketReference`
  - `expiresAt`
  - `approvedBy`
- Enforcement:
  - Hard maximum duration: 8 hours
  - Auto-revoke at expiration
  - Mandatory audit events on grant, use, and revoke

## Logging Requirements
- Every `deny` decision logs reason code with request id.
- Every `allow` for management mutation logs actor/resource/action.
- Policy decision logs must be exportable per organization.

## Test Requirements
- Unit tests for reason code determinism.
- Integration tests for tenant-scope mismatch denial.
- Regression tests for break-glass expiry behavior.
