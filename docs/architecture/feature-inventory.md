# Feature Inventory Blueprint

## Baseline Modules
- `identity-access`
- `organization-profile`
- `content-cms`
- `reservations-core`
- `payments-core`
- `community-events`
- `operations-audit`

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
