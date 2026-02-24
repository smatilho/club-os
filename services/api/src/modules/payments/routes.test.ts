import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  paymentRoutes,
  paymentService,
  fakeProvider,
} from "./routes";
import { reservationRoutes, reservationService } from "../reservations/routes";
import { processReservationPayment } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";
import type { OrgId, UserId, ReservationId } from "@club-os/domain-core";

const DEFAULT_ORG = "org-default";
const STARTS = "2026-03-01T10:00:00.000Z";
const ENDS = "2026-03-01T12:00:00.000Z";

function createTestApp() {
  const app = new Hono();
  reservationRoutes(app, {
    auth: "mock",
    defaultOrgId: DEFAULT_ORG,
    paymentHandler: processReservationPayment,
  });
  paymentRoutes(app, { auth: "mock" });
  return app;
}

function mockHeaders(
  userId: string,
  orgId: string,
  roles: string = "member",
): Record<string, string> {
  return {
    "x-mock-user-id": userId,
    "x-mock-org-id": orgId,
    "x-mock-roles": roles,
  };
}

async function createReservation(
  app: Hono,
  userId = "u1",
  idempotencyKey = "pay-key-1",
): Promise<{ reservationId: string; holdId: string }> {
  const availRes = await app.request(
    `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
    { headers: mockHeaders(userId, DEFAULT_ORG) },
  );
  const resourceId = (await availRes.json()).data[0].resourceUnitId;

  const holdRes = await app.request("/api/reservations/holds", {
    method: "POST",
    headers: {
      ...mockHeaders(userId, DEFAULT_ORG),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      resourceUnitId: resourceId,
      startsAt: STARTS,
      endsAt: ENDS,
    }),
  });
  const holdId = (await holdRes.json()).data.id;

  const createRes = await app.request("/api/reservations", {
    method: "POST",
    headers: {
      ...mockHeaders(userId, DEFAULT_ORG),
      "content-type": "application/json",
    },
    body: JSON.stringify({ holdId, idempotencyKey }),
  });
  const resData = await createRes.json();
  return { reservationId: resData.data.id, holdId };
}

describe("payment routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    reservationService.reset();
    paymentService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Integration: Reservation + Payment ---

  describe("reservation + payment integration", () => {
    it("reservation is confirmed after successful payment", async () => {
      const { reservationId } = await createReservation(app);

      const res = await app.request(`/api/reservations/${reservationId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("confirmed");
      expect(body.data.paymentTransactionId).not.toBeNull();
    });

    it("reservation is payment_failed when provider fails", async () => {
      fakeProvider.shouldFail = true;
      fakeProvider.failureCode = "insufficient_funds";

      const { reservationId } = await createReservation(
        app,
        "u1",
        "fail-key",
      );

      const res = await app.request(`/api/reservations/${reservationId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const body = await res.json();
      expect(body.data.status).toBe("payment_failed");
    });
  });

  // --- GET /api/payments/my ---

  describe("GET /api/payments/my", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/payments/my");
      expect(res.status).toBe(401);
    });

    it("returns member's transactions", async () => {
      const { reservationId } = await createReservation(app, "u1", "my-txn-key");
      // Verify payment was created
      const txns = paymentService.listMyTransactions(
        "u1" as UserId,
        DEFAULT_ORG as OrgId,
      );
      expect(txns.length).toBeGreaterThan(0);

      const res = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  // --- GET /api/payments/transactions/:id ---

  describe("GET /api/payments/transactions/:id", () => {
    it("returns own transaction for member", async () => {
      await createReservation(app, "u1", "txn-detail-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/payments/transactions/${txnId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
    });

    it("returns 403 for different user without finance.read", async () => {
      await createReservation(app, "u1", "txn-403-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/payments/transactions/${txnId}`, {
        headers: mockHeaders("u2", DEFAULT_ORG),
      });
      expect(res.status).toBe(403);
    });

    it("allows treasurer to view other's transaction", async () => {
      await createReservation(app, "u1", "txn-treasurer-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/payments/transactions/${txnId}`, {
        headers: mockHeaders("u2", DEFAULT_ORG, "treasurer"),
      });
      expect(res.status).toBe(200);
    });
  });

  // --- Webhook ---

  describe("POST /api/payments/webhooks/fake", () => {
    it("processes a webhook", async () => {
      await createReservation(app, "u1", "webhook-route-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txn = (await myRes.json()).data[0];

      const res = await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerTransactionId: txn.providerTransactionId,
          status: "succeeded",
        }),
      });
      expect(res.status).toBe(200);
    });

    it("returns 400 without providerTransactionId", async () => {
      const res = await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "succeeded" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown provider transaction", async () => {
      const res = await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerTransactionId: "unknown",
          status: "succeeded",
        }),
      });
      expect(res.status).toBe(404);
    });

    it("duplicate webhook is safe (idempotent)", async () => {
      await createReservation(app, "u1", "dup-webhook-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txn = (await myRes.json()).data[0];

      // Send webhook twice
      await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerTransactionId: txn.providerTransactionId,
          status: "succeeded",
        }),
      });
      const res = await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerTransactionId: txn.providerTransactionId,
          status: "succeeded",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("succeeded");
    });

    it("failed webhook syncs reservation to payment_failed", async () => {
      const resourceId = reservationService.listResources(DEFAULT_ORG as OrgId)[0]!.id;
      const hold = reservationService.createHold({
        organizationId: DEFAULT_ORG as OrgId,
        userId: "u1" as UserId,
        resourceUnitId: resourceId,
        startsAt: STARTS,
        endsAt: ENDS,
      });
      if (!hold.ok) throw new Error("hold failed");
      const reservation = reservationService.createReservation({
        holdId: hold.value.id,
        organizationId: DEFAULT_ORG as OrgId,
        userId: "u1" as UserId,
        idempotencyKey: "route-webhook-fail-reservation",
      });
      if (!reservation.ok) throw new Error("reservation failed");

      fakeProvider.shouldFail = true;
      fakeProvider.failureCode = "processor_timeout";
      const txn = await paymentService.initiatePayment({
        organizationId: DEFAULT_ORG as OrgId,
        reservationId: reservation.value.id,
        userId: "u1" as UserId,
        amount: reservation.value.totalAmount,
        idempotencyKey: "route-webhook-fail-payment",
      });
      if (!txn.ok) throw new Error("payment init failed");

      const res = await app.request("/api/payments/webhooks/fake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerTransactionId: txn.value.providerTransactionId,
          status: "failed",
          failureCode: "processor_timeout",
        }),
      });
      expect(res.status).toBe(200);

      const reservationAfter = reservationService.getReservation(
        reservation.value.id,
        DEFAULT_ORG as OrgId,
      );
      expect(reservationAfter.ok).toBe(true);
      if (!reservationAfter.ok) return;
      expect(reservationAfter.value.status).toBe("payment_failed");
    });
  });

  // --- Admin: Refund ---

  describe("POST /api/admin/payments/:id/refund", () => {
    it("returns 403 for member", async () => {
      const res = await app.request("/api/admin/payments/fake-id/refund", {
        method: "POST",
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("refunds a transaction for treasurer", async () => {
      await createReservation(app, "u1", "refund-route-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/admin/payments/${txnId}/refund`, {
        method: "POST",
        headers: mockHeaders("admin1", DEFAULT_ORG, "treasurer"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("refunded");
    });

    it("refund is idempotent", async () => {
      await createReservation(app, "u1", "refund-idem-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      await app.request(`/api/admin/payments/${txnId}/refund`, {
        method: "POST",
        headers: mockHeaders("admin1", DEFAULT_ORG, "treasurer"),
      });
      const res = await app.request(`/api/admin/payments/${txnId}/refund`, {
        method: "POST",
        headers: mockHeaders("admin1", DEFAULT_ORG, "treasurer"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("refunded");
    });

    it("returns tenant mismatch deny reason for cross-tenant refund", async () => {
      await createReservation(app, "u1", "refund-cross-tenant-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/admin/payments/${txnId}/refund`, {
        method: "POST",
        headers: mockHeaders("admin2", "org-other", "treasurer"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });
  });

  describe("tenant isolation on payment routes", () => {
    it("returns tenant mismatch deny reason for cross-tenant transaction detail", async () => {
      await createReservation(app, "u1", "txn-cross-tenant-key");
      const myRes = await app.request("/api/payments/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      const txnId = (await myRes.json()).data[0].id;

      const res = await app.request(`/api/payments/transactions/${txnId}`, {
        headers: mockHeaders("u1", "org-other"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });
  });

  // --- Audit Logging ---

  describe("audit logging", () => {
    it("logs deny for unauthorized refund attempt", async () => {
      await app.request("/api/admin/payments/fake-id/refund", {
        method: "POST",
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      const denyEntry = auditWriter.entries.find(
        (e) => e.decision.effect === "deny" && e.action === "finance.refund",
      );
      expect(denyEntry).toBeDefined();
    });
  });
});
