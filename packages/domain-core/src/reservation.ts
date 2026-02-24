import type {
  OrgId,
  UserId,
  ResourceUnitId,
  ReservationHoldId,
  ReservationId,
  PaymentTransactionId,
} from "./ids";

// --- Booking Mode ---

export type BookingMode = "bed_selection" | "room_booking";

// --- Resource Unit ---

export type ResourceUnitStatus = "active" | "inactive";
export type ResourceUnitKind = "bed" | "room" | "slot" | "equipment";

export interface ResourceUnit {
  id: ResourceUnitId;
  organizationId: OrgId;
  locationId: string | null;
  code: string;
  name: string;
  kind: ResourceUnitKind;
  capacity: number;
  status: ResourceUnitStatus;
  metadata?: Record<string, string>;
}

// --- Reservation Hold ---

export type ReservationHoldStatus = "held" | "expired" | "released" | "consumed";

export interface ReservationHold {
  id: ReservationHoldId;
  organizationId: OrgId;
  userId: UserId;
  resourceUnitId: ResourceUnitId;
  startsAt: string;
  endsAt: string;
  status: ReservationHoldStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- Reservation ---

export type ReservationStatus =
  | "held"
  | "payment_pending"
  | "confirmed"
  | "payment_failed"
  | "canceled";

export type ReservationSource = "member_self_service" | "admin_override";

export interface Money {
  currency: string;
  amount: number;
}

export interface Reservation {
  id: ReservationId;
  organizationId: OrgId;
  userId: UserId;
  resourceUnitId: ResourceUnitId;
  holdId: ReservationHoldId | null;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  totalAmount: Money;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
  paymentTransactionId: PaymentTransactionId | null;
  source: ReservationSource;
  version: number;
}

// --- Availability ---

export type BlockingReason = "confirmed_reservation" | "active_hold" | null;

export interface AvailabilityItem {
  resourceUnitId: ResourceUnitId;
  code: string;
  name: string;
  kind: string;
  available: boolean;
  blockingReason: BlockingReason;
}
