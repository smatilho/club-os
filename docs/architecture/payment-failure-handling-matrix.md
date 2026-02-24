# Payment Failure Handling Matrix

Phase 3 required artifact. Documents failure scenarios, expected behavior, and test coverage for the payment integration.

## Simplifications (Phase 3)

- In-memory stores; no durable persistence
- Fake payment provider with configurable success/failure
- Single currency (USD)
- No real webhook signature validation (dev/test only)
- On payment failure, hold remains consumed; user must create a new hold to retry

## Failure Scenarios

### 1. Timeout During Provider Initiation

| Field | Value |
|---|---|
| **Trigger** | Provider `initiatePayment()` hangs or network timeout |
| **Expected behavior** | Transaction remains in `initiated` status. Reservation stays `payment_pending`. |
| **Idempotency** | Retry with same idempotency key returns existing transaction without re-calling provider. |
| **Audit/logging** | Transaction creation logged. No settlement audit until resolved. |
| **Test coverage** | `payments/service.test.ts` — idempotency tests verify deduplication on retry. Phase 3 uses synchronous fake provider so true timeout is not simulated; documented for Phase 5 hardening. |

### 2. Duplicate Webhook Delivery

| Field | Value |
|---|---|
| **Trigger** | Provider sends the same webhook event multiple times |
| **Expected behavior** | First webhook updates transaction status. Subsequent webhooks are no-ops if transaction is already in terminal state (`succeeded`, `refunded`). |
| **Idempotency** | `processWebhook()` checks current status before applying transition. Already-succeeded transactions are not overwritten. |
| **Audit/logging** | Each webhook call is processed; no duplicate side effects. |
| **Test coverage** | `payments/service.test.ts` — "duplicate webhook does not change already-succeeded state", `payments/routes.test.ts` — "duplicate webhook is safe (idempotent)" |

### 3. Webhook Arrives After Local Success

| Field | Value |
|---|---|
| **Trigger** | Provider returns success synchronously, then later delivers a success webhook for the same transaction |
| **Expected behavior** | Transaction is already `succeeded`. Webhook is a no-op. Reservation remains `confirmed`. |
| **Idempotency** | Webhook handler checks terminal state and returns existing transaction. |
| **Audit/logging** | Webhook processed but no state change. |
| **Test coverage** | `payments/service.test.ts` — "is idempotent on already-succeeded transaction" |

### 4. Payment Success Event After Cancellation

| Field | Value |
|---|---|
| **Trigger** | User cancels reservation while payment is processing, then payment succeeds |
| **Expected behavior** | Payment transaction moves to `succeeded`. Reservation remains `canceled` (cancellation takes precedence). `confirmReservation()` returns error for canceled reservation. |
| **Idempotency** | Reservation confirmation is rejected for canceled status. Payment transaction is independent. |
| **Audit/logging** | Both cancellation and payment success are logged. Orphaned successful payment may need manual refund. |
| **Test coverage** | `reservations/service.test.ts` — "cannot confirm a canceled reservation" |

### 5. Partial Failure (Payment Succeeds but Reservation Update Fails)

| Field | Value |
|---|---|
| **Trigger** | `paymentService.initiatePayment()` succeeds but `reservationService.confirmReservation()` fails (e.g., reservation not found or invalid state) |
| **Expected behavior** | Payment transaction is `succeeded`. Reservation remains in `payment_pending`. Admin can use `override-confirm` to resolve. |
| **Idempotency** | `confirmReservation()` is idempotent — can be retried. Already-confirmed reservations return ok. |
| **Audit/logging** | Payment success logged. Reservation confirmation failure logged. Admin override produces audit entry. |
| **Test coverage** | `reservations/service.test.ts` — "confirm is idempotent on already-confirmed reservation"; `reservations/routes.test.ts` — "override-confirms a reservation for reservationist" |

### 6. Refund Requested Twice

| Field | Value |
|---|---|
| **Trigger** | Admin submits refund twice (double-click, network retry, etc.) |
| **Expected behavior** | First refund succeeds, transaction moves to `refunded`. Second refund returns the same `refunded` transaction without calling the provider again. |
| **Idempotency** | `refundPayment()` checks if already `refunded` and returns ok immediately. Provider is only called once. |
| **Audit/logging** | First refund produces audit entry. Second attempt is a no-op read. |
| **Test coverage** | `payments/service.test.ts` — "refund is idempotent" (verifies provider called once), `payments/routes.test.ts` — "refund is idempotent" |

## Phase 5 Hardening Notes

- Add real timeout handling with circuit breaker pattern
- Add webhook signature validation
- Add dead-letter queue for unresolvable payment/reservation mismatches
- Add automated reconciliation job for orphaned payments
- Add alerting for partial failure scenarios
