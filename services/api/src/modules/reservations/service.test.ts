import { describe, it, expect, beforeEach } from "vitest";
import { ReservationService } from "./service";
import type {
  OrgId,
  UserId,
  ResourceUnitId,
  ReservationHoldId,
} from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;
const USER1 = "user-1" as UserId;
const USER2 = "user-2" as UserId;

const TOMORROW = "2026-03-01T10:00:00.000Z";
const TOMORROW_END = "2026-03-01T12:00:00.000Z";
const TOMORROW_OVERLAP = "2026-03-01T11:00:00.000Z";
const TOMORROW_AFTER = "2026-03-01T13:00:00.000Z";

describe("ReservationService", () => {
  let service: ReservationService;
  let resourceId: ResourceUnitId;

  beforeEach(() => {
    service = new ReservationService();
    const resource = service.seedResource({
      organizationId: ORG1,
      code: "BED-01",
      name: "Bed 1",
      kind: "bed",
    });
    resourceId = resource.id;
  });

  // --- Resource Inventory ---

  describe("seedResource", () => {
    it("creates a resource unit", () => {
      const resource = service.seedResource({
        organizationId: ORG1,
        code: "ROOM-01",
        name: "Room 1",
        kind: "room",
        capacity: 2,
      });
      expect(resource.code).toBe("ROOM-01");
      expect(resource.kind).toBe("room");
      expect(resource.capacity).toBe(2);
      expect(resource.status).toBe("active");
    });
  });

  describe("getResource", () => {
    it("returns resource for correct org", () => {
      const result = service.getResource(resourceId, ORG1);
      expect(result.ok).toBe(true);
    });

    it("rejects cross-tenant access", () => {
      const result = service.getResource(resourceId, ORG2);
      expect(result.ok).toBe(false);
    });
  });

  // --- Availability ---

  describe("checkAvailability", () => {
    it("returns available when no holds or reservations", () => {
      const items = service.checkAvailability(
        ORG1,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items).toHaveLength(1);
      expect(items[0].available).toBe(true);
      expect(items[0].blockingReason).toBeNull();
    });

    it("marks resource unavailable when active hold exists", () => {
      service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });

      const items = service.checkAvailability(
        ORG1,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items[0].available).toBe(false);
      expect(items[0].blockingReason).toBe("active_hold");
    });

    it("marks resource unavailable when confirmed reservation exists", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-1",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.confirmReservation(
        res.value.id,
        ORG1,
        "txn-1" as any,
      );

      const items = service.checkAvailability(
        ORG1,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items[0].available).toBe(false);
      expect(items[0].blockingReason).toBe("confirmed_reservation");
    });

    it("does not block for canceled reservations", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-cancel",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.cancelReservation(res.value.id, ORG1, USER1, true);

      const items = service.checkAvailability(
        ORG1,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items[0].available).toBe(true);
    });

    it("does not block for expired holds", () => {
      // Create hold then advance time past expiry
      service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });

      // Advance clock 20 minutes (past 15-minute default)
      service.setNowFn(
        () => new Date(Date.now() + 20 * 60 * 1000),
      );

      const items = service.checkAvailability(
        ORG1,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items[0].available).toBe(true);
    });

    it("allows non-overlapping time ranges on same resource", () => {
      service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });

      const items = service.checkAvailability(
        ORG1,
        TOMORROW_END,
        TOMORROW_AFTER,
      );
      expect(items[0].available).toBe(true);
    });

    it("filters by kind", () => {
      service.seedResource({
        organizationId: ORG1,
        code: "ROOM-01",
        name: "Room 1",
        kind: "room",
      });

      const beds = service.checkAvailability(ORG1, TOMORROW, TOMORROW_END, "bed");
      expect(beds).toHaveLength(1);
      expect(beds[0].kind).toBe("bed");

      const rooms = service.checkAvailability(ORG1, TOMORROW, TOMORROW_END, "room");
      expect(rooms).toHaveLength(1);
      expect(rooms[0].kind).toBe("room");
    });

    it("does not return resources from other orgs", () => {
      const items = service.checkAvailability(
        ORG2,
        TOMORROW,
        TOMORROW_END,
      );
      expect(items).toHaveLength(0);
    });
  });

  // --- Holds ---

  describe("createHold", () => {
    it("creates a hold on an available resource", () => {
      const result = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("held");
      expect(result.value.userId).toBe(USER1);
    });

    it("rejects hold on non-existent resource", () => {
      const result = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: "bad-id" as ResourceUnitId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      expect(result.ok).toBe(false);
    });

    it("rejects hold when endsAt <= startsAt", () => {
      const result = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW_END,
        endsAt: TOMORROW,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("endsAt must be after startsAt");
    });

    it("rejects overlapping hold", () => {
      service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });

      const result = service.createHold({
        organizationId: ORG1,
        userId: USER2,
        resourceUnitId: resourceId,
        startsAt: TOMORROW_OVERLAP,
        endsAt: TOMORROW_AFTER,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("active hold");
    });

    it("rejects hold on cross-tenant resource", () => {
      const result = service.createHold({
        organizationId: ORG2,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("hold expiry", () => {
    it("expires hold after expiresAt", () => {
      const result = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!result.ok) throw new Error("hold failed");

      // Advance past expiry
      service.setNowFn(
        () => new Date(Date.now() + 20 * 60 * 1000),
      );

      const hold = service.getHold(result.value.id, ORG1);
      expect(hold.ok).toBe(true);
      if (!hold.ok) return;
      expect(hold.value.status).toBe("expired");
    });
  });

  describe("releaseHold", () => {
    it("releases own hold", () => {
      const holdResult = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdResult.ok) throw new Error("hold failed");

      const result = service.releaseHold(
        holdResult.value.id,
        ORG1,
        USER1,
        false,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("released");
    });

    it("rejects release by different user without management", () => {
      const holdResult = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdResult.ok) throw new Error("hold failed");

      const result = service.releaseHold(
        holdResult.value.id,
        ORG1,
        USER2,
        false,
      );
      expect(result.ok).toBe(false);
    });

    it("allows management to release another user's hold", () => {
      const holdResult = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdResult.ok) throw new Error("hold failed");

      const result = service.releaseHold(
        holdResult.value.id,
        ORG1,
        USER2,
        true,
      );
      expect(result.ok).toBe(true);
    });

    it("rejects release of already-released hold", () => {
      const holdResult = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdResult.ok) throw new Error("hold failed");

      service.releaseHold(holdResult.value.id, ORG1, USER1, false);
      const result = service.releaseHold(
        holdResult.value.id,
        ORG1,
        USER1,
        false,
      );
      expect(result.ok).toBe(false);
    });

    it("rejects cross-tenant release", () => {
      const holdResult = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdResult.ok) throw new Error("hold failed");

      const result = service.releaseHold(
        holdResult.value.id,
        ORG2,
        USER1,
        false,
      );
      expect(result.ok).toBe(false);
    });
  });

  // --- Reservation Lifecycle (State Machine) ---

  describe("reservation state machine", () => {
    it("creates reservation in payment_pending from hold", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const result = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-1",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("payment_pending");
      expect(result.value.source).toBe("member_self_service");
      expect(result.value.holdId).toBe(hold.value.id);
    });

    it("consumes hold when reservation is created", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-consume",
      });

      const updatedHold = service.getHold(hold.value.id, ORG1);
      expect(updatedHold.ok).toBe(true);
      if (!updatedHold.ok) return;
      expect(updatedHold.value.status).toBe("consumed");
    });

    it("transitions payment_pending -> confirmed on payment success", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-confirm",
      });
      if (!res.ok) throw new Error("reservation failed");

      const result = service.confirmReservation(
        res.value.id,
        ORG1,
        "txn-1" as any,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("confirmed");
      expect(result.value.confirmedAt).not.toBeNull();
      expect(result.value.paymentTransactionId).toBe("txn-1");
      expect(result.value.version).toBe(2);
    });

    it("transitions payment_pending -> payment_failed on payment failure", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-fail",
      });
      if (!res.ok) throw new Error("reservation failed");

      const result = service.failReservationPayment(res.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("payment_failed");
    });

    it("confirm is idempotent on already-confirmed reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-idempotent",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.confirmReservation(res.value.id, ORG1, "txn-1" as any);
      const result = service.confirmReservation(
        res.value.id,
        ORG1,
        "txn-1" as any,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("confirmed");
    });

    it("cannot confirm a canceled reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-cancel-confirm",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.cancelReservation(res.value.id, ORG1, USER1, true);
      const result = service.confirmReservation(
        res.value.id,
        ORG1,
        "txn-1" as any,
      );
      expect(result.ok).toBe(false);
    });

    it("cancels a payment_pending reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-cancel-pending",
      });
      if (!res.ok) throw new Error("reservation failed");

      const result = service.cancelReservation(
        res.value.id,
        ORG1,
        USER1,
        false,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("canceled");
      expect(result.value.canceledAt).not.toBeNull();
    });

    it("only management can cancel a confirmed reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-cancel-confirmed",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.confirmReservation(res.value.id, ORG1, "txn-1" as any);

      // Member cannot cancel
      const memberCancel = service.cancelReservation(
        res.value.id,
        ORG1,
        USER1,
        false,
      );
      expect(memberCancel.ok).toBe(false);

      // Management can cancel
      const mgmtCancel = service.cancelReservation(
        res.value.id,
        ORG1,
        USER1,
        true,
      );
      expect(mgmtCancel.ok).toBe(true);
    });

    it("cancel is idempotent", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-cancel-idempotent",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.cancelReservation(res.value.id, ORG1, USER1, false);
      const result = service.cancelReservation(
        res.value.id,
        ORG1,
        USER1,
        false,
      );
      expect(result.ok).toBe(true);
    });
  });

  // --- Hold Reuse Prevention ---

  describe("hold reuse prevention", () => {
    it("rejects creating reservation from consumed hold", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-first",
      });

      const result = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-second",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("consumed");
    });

    it("rejects creating reservation from expired hold", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      // Expire the hold
      service.setNowFn(
        () => new Date(Date.now() + 20 * 60 * 1000),
      );

      const result = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-expired",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("expired");
    });

    it("rejects creating reservation from released hold", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      service.releaseHold(hold.value.id, ORG1, USER1, false);

      const result = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-released",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("released");
    });
  });

  // --- Idempotency ---

  describe("idempotency", () => {
    it("same idempotency key returns same reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const first = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "dedup-key",
      });
      const second = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "dedup-key",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.value.id).toBe(second.value.id);
    });

    it("rejects idempotency key reuse with different hold", () => {
      const holdA = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdA.ok) throw new Error("hold A failed");

      const secondResource = service.seedResource({
        organizationId: ORG1,
        code: "BED-02",
        name: "Bed 2",
        kind: "bed",
      });
      const holdB = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: secondResource.id,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!holdB.ok) throw new Error("hold B failed");

      const first = service.createReservation({
        holdId: holdA.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "dedup-conflict",
      });
      expect(first.ok).toBe(true);

      const second = service.createReservation({
        holdId: holdB.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "dedup-conflict",
      });
      expect(second.ok).toBe(false);
      if (second.ok) return;
      expect(second.error).toContain("Idempotency key conflict");
    });

    it("reset clears reservation idempotency keys", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const first = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "reset-key",
      });
      expect(first.ok).toBe(true);

      service.reset();
      const newResource = service.seedResource({
        organizationId: ORG1,
        code: "BED-RESET",
        name: "Bed Reset",
        kind: "bed",
      });
      const newHold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: newResource.id,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!newHold.ok) throw new Error("new hold failed");

      const second = service.createReservation({
        holdId: newHold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "reset-key",
      });
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(second.value.id).not.toBe(first.value.id);
    });
  });

  // --- Admin Override ---

  describe("overrideConfirm", () => {
    it("confirms a payment_pending reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-override",
      });
      if (!res.ok) throw new Error("reservation failed");

      const result = service.overrideConfirm(res.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("confirmed");
      expect(result.value.source).toBe("admin_override");
    });

    it("confirms a payment_failed reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-override-fail",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.failReservationPayment(res.value.id, ORG1);

      const result = service.overrideConfirm(res.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("confirmed");
    });

    it("is idempotent on already-confirmed", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-override-idem",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.overrideConfirm(res.value.id, ORG1);
      const result = service.overrideConfirm(res.value.id, ORG1);
      expect(result.ok).toBe(true);
    });

    it("rejects override on canceled reservation", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-override-canceled",
      });
      if (!res.ok) throw new Error("reservation failed");

      service.cancelReservation(res.value.id, ORG1, USER1, true);
      const result = service.overrideConfirm(res.value.id, ORG1);
      expect(result.ok).toBe(false);
    });
  });

  describe("createOverrideReservation", () => {
    it("creates a confirmed reservation bypassing hold", () => {
      const result = service.createOverrideReservation({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("confirmed");
      expect(result.value.source).toBe("admin_override");
      expect(result.value.holdId).toBeNull();
      expect(result.value.confirmedAt).not.toBeNull();
    });

    it("rejects invalid date range", () => {
      const result = service.createOverrideReservation({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW_END,
        endsAt: TOMORROW,
      });
      expect(result.ok).toBe(false);
    });

    it("rejects cross-tenant resource", () => {
      const result = service.createOverrideReservation({
        organizationId: ORG2,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      expect(result.ok).toBe(false);
    });
  });

  // --- Tenant Isolation ---

  describe("tenant isolation", () => {
    it("getHold rejects cross-tenant access", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const result = service.getHold(hold.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("getReservation rejects cross-tenant access", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      const res = service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-tenant",
      });
      if (!res.ok) throw new Error("reservation failed");

      const result = service.getReservation(res.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("listMyReservations only returns own-org reservations", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-my-org",
      });

      const org1List = service.listMyReservations(USER1, ORG1);
      expect(org1List).toHaveLength(1);

      const org2List = service.listMyReservations(USER1, ORG2);
      expect(org2List).toHaveLength(0);
    });

    it("listReservations only returns org's reservations", () => {
      const hold = service.createHold({
        organizationId: ORG1,
        userId: USER1,
        resourceUnitId: resourceId,
        startsAt: TOMORROW,
        endsAt: TOMORROW_END,
      });
      if (!hold.ok) throw new Error("hold failed");

      service.createReservation({
        holdId: hold.value.id,
        organizationId: ORG1,
        userId: USER1,
        idempotencyKey: "key-list-org",
      });

      expect(service.listReservations(ORG1)).toHaveLength(1);
      expect(service.listReservations(ORG2)).toHaveLength(0);
    });
  });

  // --- Dev Inventory ---

  describe("seedDevInventory", () => {
    it("creates beds and rooms", () => {
      const units = service.seedDevInventory(ORG1);
      expect(units.length).toBe(6); // 4 beds + 2 rooms
      expect(units.filter((u) => u.kind === "bed")).toHaveLength(4);
      expect(units.filter((u) => u.kind === "room")).toHaveLength(2);
    });
  });
});
