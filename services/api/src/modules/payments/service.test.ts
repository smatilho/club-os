import { describe, it, expect, beforeEach } from "vitest";
import { PaymentService, FakePaymentProvider } from "./service";
import type {
  OrgId,
  UserId,
  ReservationId,
  PaymentTransactionId,
} from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;
const USER1 = "user-1" as UserId;
const RES1 = "res-1" as ReservationId;

describe("PaymentService", () => {
  let service: PaymentService;
  let provider: FakePaymentProvider;

  beforeEach(() => {
    provider = new FakePaymentProvider();
    service = new PaymentService(provider);
  });

  // --- Initiate Payment ---

  describe("initiatePayment", () => {
    it("creates a succeeded transaction on successful provider call", async () => {
      const result = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "key-1",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("succeeded");
      expect(result.value.providerTransactionId).toBeTruthy();
      expect(result.value.settledAt).not.toBeNull();
      expect(result.value.version).toBe(2);
    });

    it("creates a failed transaction when provider fails", async () => {
      provider.shouldFail = true;
      provider.failureCode = "card_declined";

      const result = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "key-fail",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("failed");
      expect(result.value.failureCode).toBe("card_declined");
    });
  });

  // --- Idempotency ---

  describe("idempotency", () => {
    it("same idempotency key returns same transaction", async () => {
      const first = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "dedup-key",
      });
      const second = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "dedup-key",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.value.id).toBe(second.value.id);
      // Provider should only be called once
      expect(provider.calls).toHaveLength(1);
    });

    it("different idempotency keys create different transactions", async () => {
      const first = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "key-a",
      });
      const second = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "key-b",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.value.id).not.toBe(second.value.id);
    });

    it("rejects idempotency key reuse with different payment semantics", async () => {
      const first = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "conflict-key",
      });
      expect(first.ok).toBe(true);

      const second = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: "res-2" as ReservationId,
        userId: USER1,
        amount: { currency: "USD", amount: 7000 },
        idempotencyKey: "conflict-key",
      });
      expect(second.ok).toBe(false);
      if (second.ok) return;
      expect(second.error).toContain("Idempotency key conflict");
      expect(provider.calls.filter((c) => c.method === "initiatePayment")).toHaveLength(1);
    });
  });

  // --- Webhook Processing ---

  describe("processWebhook", () => {
    it("processes success webhook for pending transaction", async () => {
      // Create a failed txn first so we can replay success
      provider.shouldFail = true;
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "webhook-key",
      });
      if (!init.ok) throw new Error("init failed");
      provider.shouldFail = false;

      const result = service.processWebhook({
        providerTransactionId: init.value.providerTransactionId!,
        status: "succeeded",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("succeeded");
      expect(result.value.settledAt).not.toBeNull();
    });

    it("is idempotent on already-succeeded transaction", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "webhook-idem",
      });
      if (!init.ok) throw new Error("init failed");

      // Transaction already succeeded via provider
      const result = service.processWebhook({
        providerTransactionId: init.value.providerTransactionId!,
        status: "succeeded",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("succeeded");
    });

    it("returns error for unknown provider transaction", () => {
      const result = service.processWebhook({
        providerTransactionId: "unknown_txn",
        status: "succeeded",
      });
      expect(result.ok).toBe(false);
    });

    it("duplicate webhook does not change already-succeeded state", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "dup-webhook",
      });
      if (!init.ok) throw new Error("init failed");

      // First webhook (no-op, already succeeded)
      service.processWebhook({
        providerTransactionId: init.value.providerTransactionId!,
        status: "succeeded",
      });

      // Second webhook (still no-op)
      const result = service.processWebhook({
        providerTransactionId: init.value.providerTransactionId!,
        status: "failed",
        failureCode: "late_failure",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Should still be succeeded, not overwritten
      expect(result.value.status).toBe("succeeded");
    });

    it("duplicate failed webhook is a no-op", async () => {
      provider.shouldFail = true;
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "dup-failed-webhook",
      });
      if (!init.ok) throw new Error("init failed");

      const firstVersion = init.value.version;
      const result = service.processWebhook({
        providerTransactionId: init.value.providerTransactionId!,
        status: "failed",
        failureCode: "duplicate_failure",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("failed");
      expect(result.value.version).toBe(firstVersion);
    });
  });

  // --- Refund ---

  describe("refundPayment", () => {
    it("refunds a succeeded transaction", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "refund-key",
      });
      if (!init.ok) throw new Error("init failed");

      const result = await service.refundPayment(init.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("refunded");
      expect(result.value.refundedAt).not.toBeNull();
    });

    it("refund is idempotent", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "refund-idem",
      });
      if (!init.ok) throw new Error("init failed");

      await service.refundPayment(init.value.id, ORG1);
      const result = await service.refundPayment(init.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("refunded");
      // Provider refund should only be called once
      const refundCalls = provider.calls.filter(
        (c) => c.method === "initiateRefund",
      );
      expect(refundCalls).toHaveLength(1);
    });

    it("rejects refund of failed transaction", async () => {
      provider.shouldFail = true;
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "refund-fail",
      });
      if (!init.ok) throw new Error("init failed");
      provider.shouldFail = false;

      const result = await service.refundPayment(init.value.id, ORG1);
      expect(result.ok).toBe(false);
    });

    it("rejects cross-tenant refund", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "refund-tenant",
      });
      if (!init.ok) throw new Error("init failed");

      const result = await service.refundPayment(init.value.id, ORG2);
      expect(result.ok).toBe(false);
    });
  });

  // --- Tenant Isolation ---

  describe("tenant isolation", () => {
    it("getTransaction rejects cross-tenant access", async () => {
      const init = await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "tenant-key",
      });
      if (!init.ok) throw new Error("init failed");

      const result = service.getTransaction(init.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("listMyTransactions only returns own-org transactions", async () => {
      await service.initiatePayment({
        organizationId: ORG1,
        reservationId: RES1,
        userId: USER1,
        amount: { currency: "USD", amount: 5000 },
        idempotencyKey: "list-key",
      });

      expect(service.listMyTransactions(USER1, ORG1)).toHaveLength(1);
      expect(service.listMyTransactions(USER1, ORG2)).toHaveLength(0);
    });
  });

  // --- FakePaymentProvider ---

  describe("FakePaymentProvider", () => {
    it("tracks calls", async () => {
      await provider.initiatePayment({
        amount: { currency: "USD", amount: 1000 },
        idempotencyKey: "track-key",
      });
      expect(provider.calls).toHaveLength(1);
      expect(provider.calls[0].method).toBe("initiatePayment");
    });

    it("resets state", () => {
      provider.shouldFail = true;
      provider.calls.push({ method: "test", input: {} });
      provider.reset();
      expect(provider.shouldFail).toBe(false);
      expect(provider.calls).toHaveLength(0);
    });
  });
});
