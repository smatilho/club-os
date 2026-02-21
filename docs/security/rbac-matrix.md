# RBAC Matrix v1

Permissions are scoped to `organization_id` unless marked `platform`.

## Roles
- `member`
- `reservationist`
- `treasurer`
- `webmaster`
- `org_admin`
- `platform_admin` (platform scope)

## Capability Groups
- `content.read`, `content.write`, `content.publish`
- `membership.read`, `membership.manage`
- `reservation.read`, `reservation.manage`, `reservation.override`
- `finance.read`, `finance.manage`, `finance.refund`
- `community.read`, `community.moderate`
- `settings.read`, `settings.manage`
- `audit.read`

## Baseline Mapping
- `member`: content.read, community.read, reservation.read (own), membership.read (own)
- `reservationist`: member + reservation.manage, reservation.override
- `treasurer`: member + finance.read, finance.manage, finance.refund
- `webmaster`: member + content.write, content.publish, settings.read
- `org_admin`: all tenant capabilities including settings.manage and audit.read
- `platform_admin`: platform-scoped org lifecycle + incident operations

## Enforcement
- API: mandatory policy check on every mutation and privileged read.
- UI: capability guards only for UX; never trusted for authz.
- DB: row policies or equivalent tenant filters.
- Audit: log actor, action, target, before/after summary, request id, timestamp.
- Policy decision contract: all privileged checks return explicit `allow`/`deny` with policy reason code.
- Emergency elevation (`break-glass`) requires:
  - explicit ticket/reference id
  - time-boxed grant
  - mandatory audit event at grant and revoke
- Audit retention baseline:
  - security and finance actions retained for minimum 24 months
  - exportable per organization for compliance and data portability
