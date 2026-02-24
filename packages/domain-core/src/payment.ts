import type {
  OrgId,
  UserId,
  ReservationId,
  PaymentTransactionId,
} from "./ids";
import type { Money } from "./reservation";

export type PaymentTransactionStatus =
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";

export interface PaymentTransaction {
  id: PaymentTransactionId;
  organizationId: OrgId;
  reservationId: ReservationId | null;
  userId: UserId;
  providerKey: string;
  providerTransactionId: string | null;
  idempotencyKey: string;
  amount: Money;
  status: PaymentTransactionStatus;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  refundedAt: string | null;
  version: number;
}
