# Domain Model v1

## Core Entities
- `Organization`: tenant root with metadata and configuration.
- `Location`: physical or virtual club-managed venue.
- `ResourceUnit`: bookable unit (bed, room, slot, equipment).
- `ReservationHold`: temporary hold with expiration.
- `Reservation`: booking record with status lifecycle.
- `MembershipPlan`: dues model and entitlements.
- `Membership`: user enrollment in organization.
- `Invoice`: bill for dues or services.
- `PaymentTransaction`: payment attempt and settlement result.
- `ContentPage`: managed public/member content asset.
- `Event`: scheduled social or operational event.
- `CommunityPost`: message/feed content.
- `AuditLog`: immutable operational event record.

## Key Value Objects
- `Money` (currency, amount)
- `DateRange` (startDate, endDate)
- `ReservationPolicy` (capacity, cancellation window, cutoffs)
- `RoleAssignment` (role, scope)

## Reservation Lifecycle
1. Availability query
2. Hold creation (`held`)
3. Checkout intent creation (`payment_pending`)
4. Payment succeeds (`confirmed`) OR fails (`payment_failed`)
5. Cancellation (`canceled`) with release semantics

## Multi-Tenant Constraints
- All user-visible data must resolve through organization scope.
- Global admins are platform-level actors and are not tenant members by default.
- Cross-tenant data access is denied unless explicitly elevated.

## Extensibility Notes
- `ResourceUnit` strategy controls booking semantics (`bed_selection`, `room_booking`, future variants).
- `ContentPage` is channel-aware (`public`, `member`, `admin_help`).
- `MembershipPlan` supports recurring and one-time billing.
