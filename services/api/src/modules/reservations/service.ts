import type {
  ResourceUnit,
  ResourceUnitKind,
  ReservationHold,
  ReservationHoldStatus,
  Reservation,
  ReservationStatus,
  ReservationSource,
  AvailabilityItem,
  Money,
  OrgId,
  UserId,
  ResourceUnitId,
  ReservationHoldId,
  ReservationId,
  PaymentTransactionId,
} from "@club-os/domain-core";
import {
  resourceUnitId,
  reservationHoldId,
  reservationId,
  ok,
  err,
  type Result,
} from "@club-os/domain-core";

/** Default hold duration in minutes */
const DEFAULT_HOLD_DURATION_MINUTES = 15;

/** Default flat booking price in cents */
const DEFAULT_BOOKING_PRICE_CENTS = 5000;

/**
 * In-memory reservation service for Phase 3.
 * Manages resource inventory, holds, and reservation lifecycle.
 */
export class ReservationService {
  private resources = new Map<string, ResourceUnit>();
  private holds = new Map<string, ReservationHold>();
  private reservations = new Map<string, Reservation>();

  private nowFn: () => Date = () => new Date();

  /** Override clock for testing hold expiry */
  setNowFn(fn: () => Date): void {
    this.nowFn = fn;
  }

  reset(): void {
    this.resources.clear();
    this.holds.clear();
    this.reservations.clear();
    this.idempotencyMap.clear();
    this.nowFn = () => new Date();
  }

  // --- Resource Inventory ---

  seedResource(input: {
    organizationId: OrgId;
    locationId?: string | null;
    code: string;
    name: string;
    kind: ResourceUnitKind;
    capacity?: number;
    metadata?: Record<string, string>;
  }): ResourceUnit {
    const resource: ResourceUnit = {
      id: resourceUnitId(crypto.randomUUID()),
      organizationId: input.organizationId,
      locationId: input.locationId ?? null,
      code: input.code,
      name: input.name,
      kind: input.kind,
      capacity: input.capacity ?? 1,
      status: "active",
      metadata: input.metadata,
    };
    this.resources.set(resource.id, resource);
    return resource;
  }

  getResource(
    id: ResourceUnitId,
    organizationId: OrgId,
  ): Result<ResourceUnit, string> {
    const resource = this.resources.get(id);
    if (!resource) return err("Resource not found");
    if (resource.organizationId !== organizationId)
      return err("Resource not found");
    return ok(resource);
  }

  listResources(
    organizationId: OrgId,
    kind?: ResourceUnitKind,
  ): ResourceUnit[] {
    return [...this.resources.values()].filter(
      (r) =>
        r.organizationId === organizationId &&
        r.status === "active" &&
        (kind ? r.kind === kind : true),
    );
  }

  // --- Availability ---

  checkAvailability(
    organizationId: OrgId,
    startsAt: string,
    endsAt: string,
    kind?: ResourceUnitKind,
  ): AvailabilityItem[] {
    this.expireStaleHolds();
    const resources = this.listResources(organizationId, kind);

    return resources.map((resource) => {
      const blocking = this.getBlockingReason(resource.id, startsAt, endsAt);
      return {
        resourceUnitId: resource.id,
        code: resource.code,
        name: resource.name,
        kind: resource.kind,
        available: blocking === null,
        blockingReason: blocking,
      };
    });
  }

  private getBlockingReason(
    resourceUnitId: ResourceUnitId,
    startsAt: string,
    endsAt: string,
  ): "confirmed_reservation" | "active_hold" | null {
    // Check confirmed reservations
    for (const res of this.reservations.values()) {
      if (
        res.resourceUnitId === resourceUnitId &&
        (res.status === "confirmed" ||
          res.status === "payment_pending" ||
          res.status === "held") &&
        this.timeOverlaps(res.startsAt, res.endsAt, startsAt, endsAt)
      ) {
        return "confirmed_reservation";
      }
    }

    // Check active holds
    for (const hold of this.holds.values()) {
      if (
        hold.resourceUnitId === resourceUnitId &&
        hold.status === "held" &&
        new Date(hold.expiresAt) > this.nowFn() &&
        this.timeOverlaps(hold.startsAt, hold.endsAt, startsAt, endsAt)
      ) {
        return "active_hold";
      }
    }

    return null;
  }

  private timeOverlaps(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
  ): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  // --- Holds ---

  createHold(input: {
    organizationId: OrgId;
    userId: UserId;
    resourceUnitId: ResourceUnitId;
    startsAt: string;
    endsAt: string;
  }): Result<ReservationHold, string> {
    // Validate resource exists and belongs to org
    const resourceResult = this.getResource(
      input.resourceUnitId,
      input.organizationId,
    );
    if (!resourceResult.ok) return err("Resource not found");

    // Validate date range
    if (input.endsAt <= input.startsAt) {
      return err("endsAt must be after startsAt");
    }

    // Check for overlap
    this.expireStaleHolds();
    const blocking = this.getBlockingReason(
      input.resourceUnitId,
      input.startsAt,
      input.endsAt,
    );
    if (blocking) {
      return err(
        blocking === "confirmed_reservation"
          ? "Resource has a confirmed reservation for this time"
          : "Resource has an active hold for this time",
      );
    }

    const now = this.nowFn();
    const expiresAt = new Date(
      now.getTime() + DEFAULT_HOLD_DURATION_MINUTES * 60 * 1000,
    );

    const hold: ReservationHold = {
      id: reservationHoldId(crypto.randomUUID()),
      organizationId: input.organizationId,
      userId: input.userId,
      resourceUnitId: input.resourceUnitId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "held",
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.holds.set(hold.id, hold);
    return ok(hold);
  }

  getHold(
    id: ReservationHoldId,
    organizationId: OrgId,
  ): Result<ReservationHold, string> {
    const hold = this.holds.get(id);
    if (!hold) return err("Hold not found");
    if (hold.organizationId !== organizationId) return err("Hold not found");
    this.maybeExpireHold(hold);
    return ok(this.holds.get(id)!);
  }

  /** Unscoped lookup for policy resource extraction only. */
  getHoldById(id: ReservationHoldId): Result<ReservationHold, string> {
    const hold = this.holds.get(id);
    if (!hold) return err("Hold not found");
    this.maybeExpireHold(hold);
    return ok(this.holds.get(id)!);
  }

  releaseHold(
    id: ReservationHoldId,
    organizationId: OrgId,
    actorUserId: UserId,
    isManagement: boolean,
  ): Result<ReservationHold, string> {
    const hold = this.holds.get(id);
    if (!hold) return err("Hold not found");
    if (hold.organizationId !== organizationId) return err("Hold not found");

    // Own hold or management access
    if (hold.userId !== actorUserId && !isManagement) {
      return err("Not authorized to release this hold");
    }

    if (hold.status !== "held") {
      return err(`Cannot release hold in status: ${hold.status}`);
    }

    const updated: ReservationHold = {
      ...hold,
      status: "released",
      updatedAt: this.nowFn().toISOString(),
    };
    this.holds.set(id, updated);
    return ok(updated);
  }

  /** Expire holds that have passed their expiresAt. */
  private expireStaleHolds(): void {
    const now = this.nowFn();
    for (const hold of this.holds.values()) {
      if (hold.status === "held" && new Date(hold.expiresAt) <= now) {
        this.holds.set(hold.id, {
          ...hold,
          status: "expired",
          updatedAt: now.toISOString(),
        });
      }
    }
  }

  /** Expire a single hold if stale (for reads). */
  private maybeExpireHold(hold: ReservationHold): void {
    if (
      hold.status === "held" &&
      new Date(hold.expiresAt) <= this.nowFn()
    ) {
      this.holds.set(hold.id, {
        ...hold,
        status: "expired",
        updatedAt: this.nowFn().toISOString(),
      });
    }
  }

  // --- Reservations ---

  /**
   * Create a reservation from a hold (member self-service flow).
   * Transitions to payment_pending.
   */
  createReservationFromHold(input: {
    holdId: ReservationHoldId;
    organizationId: OrgId;
    userId: UserId;
    idempotencyKey: string;
  }): Result<Reservation, string> {
    // Check idempotency - if same key exists, return existing reservation
    const existing = this.findByIdempotencyKey(
      input.idempotencyKey,
      input.organizationId,
    );
    if (existing) {
      if (existing.holdId !== input.holdId || existing.userId !== input.userId) {
        return err("Idempotency key conflict for a different reservation request");
      }
      return ok(existing);
    }

    const hold = this.holds.get(input.holdId);
    if (!hold) return err("Hold not found");
    if (hold.organizationId !== input.organizationId)
      return err("Hold not found");
    if (hold.userId !== input.userId)
      return err("Hold belongs to a different user");

    this.maybeExpireHold(hold);
    const currentHold = this.holds.get(input.holdId)!;

    if (currentHold.status !== "held") {
      return err(`Hold is ${currentHold.status}, cannot create reservation`);
    }

    const now = this.nowFn().toISOString();
    const reservation: Reservation = {
      id: reservationId(crypto.randomUUID()),
      organizationId: input.organizationId,
      userId: input.userId,
      resourceUnitId: hold.resourceUnitId,
      holdId: hold.id,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt,
      status: "payment_pending",
      totalAmount: { currency: "USD", amount: DEFAULT_BOOKING_PRICE_CENTS },
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      canceledAt: null,
      paymentTransactionId: null,
      source: "member_self_service",
      version: 1,
    };

    // Mark hold as consumed
    this.holds.set(hold.id, {
      ...currentHold,
      status: "consumed",
      updatedAt: now,
    });

    this.reservations.set(reservation.id, reservation);
    return ok(reservation);
  }

  /**
   * Admin override: create a confirmed reservation bypassing hold flow.
   */
  createOverrideReservation(input: {
    organizationId: OrgId;
    userId: UserId;
    resourceUnitId: ResourceUnitId;
    startsAt: string;
    endsAt: string;
  }): Result<Reservation, string> {
    // Validate resource
    const resourceResult = this.getResource(
      input.resourceUnitId,
      input.organizationId,
    );
    if (!resourceResult.ok) return err("Resource not found");

    // Validate dates
    if (input.endsAt <= input.startsAt) {
      return err("endsAt must be after startsAt");
    }

    const now = this.nowFn().toISOString();
    const reservation: Reservation = {
      id: reservationId(crypto.randomUUID()),
      organizationId: input.organizationId,
      userId: input.userId,
      resourceUnitId: input.resourceUnitId,
      holdId: null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "confirmed",
      totalAmount: { currency: "USD", amount: DEFAULT_BOOKING_PRICE_CENTS },
      createdAt: now,
      updatedAt: now,
      confirmedAt: now,
      canceledAt: null,
      paymentTransactionId: null,
      source: "admin_override",
      version: 1,
    };

    this.reservations.set(reservation.id, reservation);
    return ok(reservation);
  }

  /**
   * Confirm a reservation after successful payment.
   * Idempotent: replaying on already-confirmed reservation returns ok.
   */
  confirmReservation(
    id: ReservationId,
    organizationId: OrgId,
    paymentTransactionId: PaymentTransactionId,
  ): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    if (reservation.organizationId !== organizationId)
      return err("Reservation not found");

    // Idempotent: already confirmed is ok
    if (reservation.status === "confirmed") return ok(reservation);

    if (
      reservation.status !== "payment_pending" &&
      reservation.status !== "payment_failed"
    ) {
      return err(
        `Cannot confirm reservation in status: ${reservation.status}`,
      );
    }

    const now = this.nowFn().toISOString();
    const updated: Reservation = {
      ...reservation,
      status: "confirmed",
      confirmedAt: now,
      paymentTransactionId,
      updatedAt: now,
      version: reservation.version + 1,
    };
    this.reservations.set(id, updated);
    return ok(updated);
  }

  /**
   * Mark reservation as payment_failed.
   * Hold remains consumed (documented simplification: user must create new hold).
   */
  failReservationPayment(
    id: ReservationId,
    organizationId: OrgId,
  ): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    if (reservation.organizationId !== organizationId)
      return err("Reservation not found");

    if (reservation.status === "payment_failed") return ok(reservation);

    if (reservation.status !== "payment_pending") {
      return err(
        `Cannot fail payment for reservation in status: ${reservation.status}`,
      );
    }

    const now = this.nowFn().toISOString();
    const updated: Reservation = {
      ...reservation,
      status: "payment_failed",
      updatedAt: now,
      version: reservation.version + 1,
    };
    this.reservations.set(id, updated);
    return ok(updated);
  }

  /**
   * Admin override: confirm a reservation that's in payment_pending or payment_failed.
   */
  overrideConfirm(
    id: ReservationId,
    organizationId: OrgId,
  ): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    if (reservation.organizationId !== organizationId)
      return err("Reservation not found");

    // Already confirmed is idempotent
    if (reservation.status === "confirmed") return ok(reservation);

    if (
      reservation.status !== "payment_pending" &&
      reservation.status !== "payment_failed"
    ) {
      return err(
        `Cannot override-confirm reservation in status: ${reservation.status}`,
      );
    }

    const now = this.nowFn().toISOString();
    const updated: Reservation = {
      ...reservation,
      status: "confirmed",
      confirmedAt: now,
      updatedAt: now,
      source: "admin_override",
      version: reservation.version + 1,
    };
    this.reservations.set(id, updated);
    return ok(updated);
  }

  cancelReservation(
    id: ReservationId,
    organizationId: OrgId,
    actorUserId: UserId,
    isManagement: boolean,
  ): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    if (reservation.organizationId !== organizationId)
      return err("Reservation not found");

    if (reservation.userId !== actorUserId && !isManagement) {
      return err("Not authorized to cancel this reservation");
    }

    if (reservation.status === "canceled") return ok(reservation);

    if (reservation.status === "confirmed" && !isManagement) {
      return err("Only management can cancel a confirmed reservation");
    }

    const now = this.nowFn().toISOString();
    const updated: Reservation = {
      ...reservation,
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
      version: reservation.version + 1,
    };
    this.reservations.set(id, updated);
    return ok(updated);
  }

  getReservation(
    id: ReservationId,
    organizationId: OrgId,
  ): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    if (reservation.organizationId !== organizationId)
      return err("Reservation not found");
    return ok(reservation);
  }

  /** Unscoped lookup for policy resource extraction only. */
  getReservationById(id: ReservationId): Result<Reservation, string> {
    const reservation = this.reservations.get(id);
    if (!reservation) return err("Reservation not found");
    return ok(reservation);
  }

  /** List reservations for a specific user (member self-service). */
  listMyReservations(userId: UserId, organizationId: OrgId): Reservation[] {
    return [...this.reservations.values()].filter(
      (r) => r.userId === userId && r.organizationId === organizationId,
    );
  }

  /** List all reservations for an organization (admin). */
  listReservations(organizationId: OrgId): Reservation[] {
    return [...this.reservations.values()].filter(
      (r) => r.organizationId === organizationId,
    );
  }

  /** Find reservation by idempotency key (for dedup). */
  private findByIdempotencyKey(
    _idempotencyKey: string,
    _organizationId: OrgId,
  ): Reservation | undefined {
    // Idempotency keys are tracked per-reservation via a side map
    // For Phase 3 simplification, we use the reservation's creation context
    return this.idempotencyMap.get(
      `${_organizationId}:${_idempotencyKey}`,
    );
  }

  private idempotencyMap = new Map<string, Reservation>();

  /**
   * Enhanced createReservationFromHold that also tracks idempotency keys.
   * This is the public entry point for member self-service reservation creation.
   */
  createReservation(input: {
    holdId: ReservationHoldId;
    organizationId: OrgId;
    userId: UserId;
    idempotencyKey: string;
  }): Result<Reservation, string> {
    // Check idempotency first
    const key = `${input.organizationId}:${input.idempotencyKey}`;
    const existing = this.idempotencyMap.get(key);
    if (existing) {
      if (existing.holdId !== input.holdId || existing.userId !== input.userId) {
        return err("Idempotency key conflict for a different reservation request");
      }
      return ok(existing);
    }

    const result = this.createReservationFromHold(input);
    if (result.ok) {
      this.idempotencyMap.set(key, result.value);
    }
    return result;
  }

  /**
   * Seed inventory for development/testing.
   * Creates a standard set of resource units.
   */
  seedDevInventory(organizationId: OrgId): ResourceUnit[] {
    const units: ResourceUnit[] = [];
    for (let i = 1; i <= 4; i++) {
      units.push(
        this.seedResource({
          organizationId,
          code: `BED-${String(i).padStart(2, "0")}`,
          name: `Bed ${i}`,
          kind: "bed",
        }),
      );
    }
    for (let i = 1; i <= 2; i++) {
      units.push(
        this.seedResource({
          organizationId,
          code: `ROOM-${String(i).padStart(2, "0")}`,
          name: `Room ${i}`,
          kind: "room",
          capacity: 2,
        }),
      );
    }
    return units;
  }
}
