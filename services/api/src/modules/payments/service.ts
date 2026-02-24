import type {
  PaymentTransaction,
  PaymentTransactionStatus,
  Money,
  OrgId,
  UserId,
  ReservationId,
  PaymentTransactionId,
} from "@club-os/domain-core";
import {
  paymentTransactionId,
  ok,
  err,
  type Result,
} from "@club-os/domain-core";

// --- Payment Provider Port ---

export interface PaymentProviderResult {
  success: boolean;
  providerTransactionId: string;
  failureCode?: string;
}

export interface PaymentProvider {
  key: string;
  initiatePayment(input: {
    amount: Money;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentProviderResult>;
  initiateRefund(input: {
    providerTransactionId: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<PaymentProviderResult>;
}

// --- Fake Payment Provider ---

export class FakePaymentProvider implements PaymentProvider {
  key = "fake";

  /** Set to true to simulate failures */
  shouldFail = false;
  failureCode = "card_declined";

  /** Tracks calls for testing */
  calls: Array<{ method: string; input: unknown }> = [];

  reset(): void {
    this.shouldFail = false;
    this.failureCode = "card_declined";
    this.calls = [];
  }

  async initiatePayment(input: {
    amount: Money;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentProviderResult> {
    this.calls.push({ method: "initiatePayment", input });

    if (this.shouldFail) {
      return {
        success: false,
        providerTransactionId: `fake_txn_${crypto.randomUUID().slice(0, 8)}`,
        failureCode: this.failureCode,
      };
    }

    return {
      success: true,
      providerTransactionId: `fake_txn_${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async initiateRefund(input: {
    providerTransactionId: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<PaymentProviderResult> {
    this.calls.push({ method: "initiateRefund", input });

    if (this.shouldFail) {
      return {
        success: false,
        providerTransactionId: input.providerTransactionId,
        failureCode: this.failureCode,
      };
    }

    return {
      success: true,
      providerTransactionId: `fake_refund_${crypto.randomUUID().slice(0, 8)}`,
    };
  }
}

// --- Payment Service ---

export class PaymentService {
  private transactions = new Map<string, PaymentTransaction>();
  private idempotencyMap = new Map<string, PaymentTransaction>();
  private provider: PaymentProvider;

  constructor(provider?: PaymentProvider) {
    this.provider = provider ?? new FakePaymentProvider();
  }

  getProvider(): PaymentProvider {
    return this.provider;
  }

  reset(): void {
    this.transactions.clear();
    this.idempotencyMap.clear();
    if (this.provider instanceof FakePaymentProvider) {
      this.provider.reset();
    }
  }

  /**
   * Initiate a payment for a reservation.
   * Idempotent: same idempotency key + org returns existing transaction.
   */
  async initiatePayment(input: {
    organizationId: OrgId;
    reservationId: ReservationId;
    userId: UserId;
    amount: Money;
    idempotencyKey: string;
  }): Promise<Result<PaymentTransaction, string>> {
    // Idempotency check
    const key = `${input.organizationId}:${input.idempotencyKey}`;
    const existing = this.idempotencyMap.get(key);
    if (existing) {
      const sameAmount =
        existing.amount.currency === input.amount.currency &&
        existing.amount.amount === input.amount.amount;
      if (
        existing.reservationId !== input.reservationId ||
        existing.userId !== input.userId ||
        !sameAmount
      ) {
        return err("Idempotency key conflict for a different payment request");
      }
      return ok(existing);
    }

    const now = new Date().toISOString();
    const txn: PaymentTransaction = {
      id: paymentTransactionId(crypto.randomUUID()),
      organizationId: input.organizationId,
      reservationId: input.reservationId,
      userId: input.userId,
      providerKey: this.provider.key,
      providerTransactionId: null,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      status: "initiated",
      failureCode: null,
      createdAt: now,
      updatedAt: now,
      settledAt: null,
      refundedAt: null,
      version: 1,
    };

    this.transactions.set(txn.id, txn);
    this.idempotencyMap.set(key, txn);

    // Call provider
    const result = await this.provider.initiatePayment({
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        reservationId: input.reservationId,
        organizationId: input.organizationId,
      },
    });

    const updated: PaymentTransaction = {
      ...txn,
      providerTransactionId: result.providerTransactionId,
      status: result.success ? "succeeded" : "failed",
      failureCode: result.failureCode ?? null,
      settledAt: result.success ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      version: 2,
    };

    this.transactions.set(txn.id, updated);
    this.idempotencyMap.set(key, updated);
    return ok(updated);
  }

  /**
   * Process a webhook event (e.g. from provider callback).
   * Idempotent: replaying a webhook for already-settled txn is a no-op.
   */
  processWebhook(input: {
    providerTransactionId: string;
    status: "succeeded" | "failed";
    failureCode?: string;
  }): Result<PaymentTransaction, string> {
    const txn = this.findByProviderTxnId(input.providerTransactionId);
    if (!txn) return err("Transaction not found");

    // Idempotent terminal-state handling.
    // succeeded/refunded are immutable; duplicate failed events are also no-ops.
    if (txn.status === "succeeded" || txn.status === "refunded") {
      return ok(txn);
    }
    if (txn.status === "failed" && input.status === "failed") {
      return ok(txn);
    }

    const now = new Date().toISOString();
    const updated: PaymentTransaction = {
      ...txn,
      status: input.status,
      failureCode: input.failureCode ?? null,
      settledAt: input.status === "succeeded" ? now : txn.settledAt,
      updatedAt: now,
      version: txn.version + 1,
    };

    this.transactions.set(txn.id, updated);
    const key = `${txn.organizationId}:${txn.idempotencyKey}`;
    this.idempotencyMap.set(key, updated);
    return ok(updated);
  }

  /**
   * Refund a payment transaction.
   * Idempotent: refunding an already-refunded transaction returns ok.
   */
  async refundPayment(
    id: PaymentTransactionId,
    organizationId: OrgId,
  ): Promise<Result<PaymentTransaction, string>> {
    const txn = this.transactions.get(id);
    if (!txn) return err("Transaction not found");
    if (txn.organizationId !== organizationId)
      return err("Transaction not found");

    // Idempotent: already refunded
    if (txn.status === "refunded") return ok(txn);

    if (txn.status !== "succeeded") {
      return err(
        `Cannot refund transaction in status: ${txn.status}`,
      );
    }

    if (!txn.providerTransactionId) {
      return err("No provider transaction to refund");
    }

    const result = await this.provider.initiateRefund({
      providerTransactionId: txn.providerTransactionId,
      amount: txn.amount,
      idempotencyKey: `refund_${txn.idempotencyKey}`,
    });

    if (!result.success) {
      return err(result.failureCode ?? "Refund failed");
    }

    const now = new Date().toISOString();
    const updated: PaymentTransaction = {
      ...txn,
      status: "refunded",
      refundedAt: now,
      updatedAt: now,
      version: txn.version + 1,
    };

    this.transactions.set(txn.id, updated);
    const key = `${txn.organizationId}:${txn.idempotencyKey}`;
    this.idempotencyMap.set(key, updated);
    return ok(updated);
  }

  getTransaction(
    id: PaymentTransactionId,
    organizationId: OrgId,
  ): Result<PaymentTransaction, string> {
    const txn = this.transactions.get(id);
    if (!txn) return err("Transaction not found");
    if (txn.organizationId !== organizationId)
      return err("Transaction not found");
    return ok(txn);
  }

  /** Unscoped lookup for policy resource extraction only. */
  getTransactionById(id: PaymentTransactionId): Result<PaymentTransaction, string> {
    const txn = this.transactions.get(id);
    if (!txn) return err("Transaction not found");
    return ok(txn);
  }

  listMyTransactions(
    userId: UserId,
    organizationId: OrgId,
  ): PaymentTransaction[] {
    return [...this.transactions.values()].filter(
      (t) => t.userId === userId && t.organizationId === organizationId,
    );
  }

  listTransactions(organizationId: OrgId): PaymentTransaction[] {
    return [...this.transactions.values()].filter(
      (t) => t.organizationId === organizationId,
    );
  }

  /** Find a transaction by reservation ID (for integration). */
  findByReservationId(
    reservationId: ReservationId,
    organizationId: OrgId,
  ): PaymentTransaction | undefined {
    return [...this.transactions.values()].find(
      (t) =>
        t.reservationId === reservationId &&
        t.organizationId === organizationId,
    );
  }

  private findByProviderTxnId(
    providerTransactionId: string,
  ): PaymentTransaction | undefined {
    return [...this.transactions.values()].find(
      (t) => t.providerTransactionId === providerTransactionId,
    );
  }
}
