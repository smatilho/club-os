# Feature Inventory Blueprint

## Baseline Modules
- `identity-access` — Phase 1 (implemented)
- `organization-profile` — Phase 2 (implemented)
- `content-cms` — Phase 2 (implemented)
- `reservations-core` — Phase 3 (implemented): inventory, holds, reservation lifecycle, availability, admin overrides
- `payments-core` — Phase 3 (implemented): idempotent payments, fake provider, webhooks, refunds
- `community-events` — planned
- `operations-audit` — planned

## Tenant Configurable Options
- Reservation mode: `bed_selection` | `room_booking`
- Public signup policy: `closed` | `request` | `open`
- Payment providers: list by adapter key
- Community module: enabled/disabled

## Example Inventory (Tenant)
```json
{
  "organizationId": "org_123",
  "modules": {
    "content-cms": { "enabled": true },
    "reservations-core": {
      "enabled": true,
      "config": { "bookingMode": "bed_selection" }
    },
    "community-events": { "enabled": false }
  }
}
```
