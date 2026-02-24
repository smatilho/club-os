import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { ReservationService } from "./service";
import type {
  OrgId,
  UserId,
  ResourceUnitId,
  ReservationHoldId,
  ReservationId,
  ResourceUnitKind,
} from "@club-os/domain-core";
import { resolveCapabilities, type Role } from "@club-os/auth-rbac";

const DEV_DEFAULT_ORG_ID = "org-default";

const reservationService = new ReservationService();

export type PaymentHandlerFn = (
  reservationId: ReservationId,
  organizationId: OrgId,
  userId: UserId,
  idempotencyKey: string,
) => Promise<{ success: boolean; transactionId: string | null; error?: string }>;

interface ReservationRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  defaultOrgId?: string;
  paymentHandler?: PaymentHandlerFn;
}

function getAuthHandler(options?: ReservationRoutesOptions): MiddlewareHandler {
  if (options?.authHandler) return options.authHandler;
  if (options?.auth === "mock") return mockAuthMiddleware;
  return getDefaultAuthHandler();
}

async function readJsonBody<T>(
  c: Context,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const body = await c.req.json<T>();
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

function isValidISODate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function hasManagementCapability(
  roles: string[],
  capability: string,
): boolean {
  const caps = resolveCapabilities(roles as Role[]);
  return caps.includes(capability as any);
}

function extractHoldResource(c: Context): { id: string; organizationId: string } {
  const id = c.req.param("id") ?? "";
  const hold = reservationService.getHoldById(id as ReservationHoldId);
  return {
    id,
    organizationId: hold.ok
      ? hold.value.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function extractReservationResource(
  c: Context,
): { id: string; organizationId: string } {
  const id = c.req.param("id") ?? "";
  const reservation = reservationService.getReservationById(id as ReservationId);
  return {
    id,
    organizationId: reservation.ok
      ? reservation.value.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

export function reservationRoutes(
  app: Hono,
  options?: ReservationRoutesOptions,
): void {
  const defaultOrgId = (options?.defaultOrgId ?? DEV_DEFAULT_ORG_ID) as OrgId;
  const paymentHandler = options?.paymentHandler ?? null;

  // Seed dev inventory on startup
  if (reservationService.listResources(defaultOrgId).length === 0) {
    reservationService.seedDevInventory(defaultOrgId);
  }

  // --- Authenticated member/self-service routes ---
  const authenticated = new Hono();
  authenticated.use("*", getAuthHandler(options));

  // GET /api/reservations/availability
  authenticated.get(
    "/availability",
    requireCapability("reservation.read", "reservation"),
    async (c) => {
      const session = c.get("session")!;
      const startsAt = c.req.query("startsAt");
      const endsAt = c.req.query("endsAt");
      const kind = c.req.query("kind") as ResourceUnitKind | undefined;

      if (!startsAt || !endsAt) {
        return c.json(
          { error: "startsAt and endsAt query params are required" },
          400,
        );
      }
      if (!isValidISODate(startsAt) || !isValidISODate(endsAt)) {
        return c.json({ error: "startsAt and endsAt must be valid ISO dates" }, 400);
      }
      if (endsAt <= startsAt) {
        return c.json({ error: "endsAt must be after startsAt" }, 400);
      }

      const items = reservationService.checkAvailability(
        session.organizationId as OrgId,
        startsAt,
        endsAt,
        kind,
      );
      return c.json({ data: items });
    },
  );

  // POST /api/reservations/holds
  authenticated.post(
    "/holds",
    requireCapability("reservation.read", "reservation-hold"),
    async (c) => {
      const session = c.get("session")!;
      const parsed = await readJsonBody<{
        resourceUnitId?: string;
        startsAt?: string;
        endsAt?: string;
      }>(c);
      if (!parsed.ok) return c.json({ error: parsed.error }, 400);
      const body = parsed.value;

      if (!body.resourceUnitId || typeof body.resourceUnitId !== "string") {
        return c.json({ error: "resourceUnitId is required" }, 400);
      }
      if (!isValidISODate(body.startsAt)) {
        return c.json({ error: "startsAt must be a valid ISO date" }, 400);
      }
      if (!isValidISODate(body.endsAt)) {
        return c.json({ error: "endsAt must be a valid ISO date" }, 400);
      }
      if (body.endsAt! <= body.startsAt!) {
        return c.json({ error: "endsAt must be after startsAt" }, 400);
      }

      const result = reservationService.createHold({
        organizationId: session.organizationId as OrgId,
        userId: session.userId as UserId,
        resourceUnitId: body.resourceUnitId as ResourceUnitId,
        startsAt: body.startsAt!,
        endsAt: body.endsAt!,
      });

      if (!result.ok) return c.json({ error: result.error }, 409);
      return c.json({ data: result.value }, 201);
    },
  );

  // GET /api/reservations/holds/:id
  authenticated.get(
    "/holds/:id",
    requireCapability("reservation.read", "reservation-hold", {
      extractResource: extractHoldResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = reservationService.getHold(
        c.req.param("id") as ReservationHoldId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);

      // Own hold or management access
      const hold = result.value;
      if (
        hold.userId !== session.userId &&
        !hasManagementCapability(session.roles, "reservation.manage")
      ) {
        return c.json({ error: "Not authorized" }, 403);
      }

      return c.json({ data: hold });
    },
  );

  // POST /api/reservations/holds/:id/release
  authenticated.post(
    "/holds/:id/release",
    requireCapability("reservation.read", "reservation-hold", {
      extractResource: extractHoldResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const isManagement = hasManagementCapability(
        session.roles,
        "reservation.manage",
      );
      const result = reservationService.releaseHold(
        c.req.param("id") as ReservationHoldId,
        session.organizationId as OrgId,
        session.userId as UserId,
        isManagement,
      );
      if (!result.ok) {
        const status = result.error.includes("Not authorized") ? 403 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // GET /api/reservations/my
  authenticated.get(
    "/my",
    requireCapability("reservation.read", "reservation"),
    async (c) => {
      const session = c.get("session")!;
      const reservations = reservationService.listMyReservations(
        session.userId as UserId,
        session.organizationId as OrgId,
      );
      return c.json({ data: reservations });
    },
  );

  // GET /api/reservations/:id
  authenticated.get(
    "/:id",
    requireCapability("reservation.read", "reservation", {
      extractResource: extractReservationResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = reservationService.getReservation(
        c.req.param("id") as ReservationId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);

      const reservation = result.value;
      // Own reservation or management access
      if (
        reservation.userId !== session.userId &&
        !hasManagementCapability(session.roles, "reservation.manage")
      ) {
        return c.json({ error: "Not authorized" }, 403);
      }

      return c.json({ data: reservation });
    },
  );

  // POST /api/reservations (create from hold + trigger payment)
  authenticated.post(
    "/",
    requireCapability("reservation.read", "reservation"),
    async (c) => {
      const session = c.get("session")!;
      const parsed = await readJsonBody<{
        holdId?: string;
        idempotencyKey?: string;
      }>(c);
      if (!parsed.ok) return c.json({ error: parsed.error }, 400);
      const body = parsed.value;

      if (!body.holdId || typeof body.holdId !== "string") {
        return c.json({ error: "holdId is required" }, 400);
      }
      if (!body.idempotencyKey || typeof body.idempotencyKey !== "string") {
        return c.json({ error: "idempotencyKey is required" }, 400);
      }

      const result = reservationService.createReservation({
        holdId: body.holdId as ReservationHoldId,
        organizationId: session.organizationId as OrgId,
        userId: session.userId as UserId,
        idempotencyKey: body.idempotencyKey,
      });

      if (!result.ok) {
        const status = result.error.includes("not found") ? 404 : 400;
        return c.json({ error: result.error }, status);
      }

      // Trigger payment if paymentHandler is configured
      if (paymentHandler) {
        const payResult = await paymentHandler(
          result.value.id,
          session.organizationId as OrgId,
          session.userId as UserId,
          body.idempotencyKey,
        );

        // Re-read the reservation to get updated status
        const updated = reservationService.getReservation(
          result.value.id,
          session.organizationId as OrgId,
        );
        return c.json({ data: updated.ok ? updated.value : result.value }, 201);
      }

      return c.json({ data: result.value }, 201);
    },
  );

  // POST /api/reservations/:id/cancel
  authenticated.post(
    "/:id/cancel",
    requireCapability("reservation.read", "reservation", {
      extractResource: extractReservationResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      // Accept optional body (reason) but don't require it
      await readJsonBody<{ reason?: string }>(c).catch(() => ({}));
      const isManagement = hasManagementCapability(
        session.roles,
        "reservation.manage",
      );
      const result = reservationService.cancelReservation(
        c.req.param("id") as ReservationId,
        session.organizationId as OrgId,
        session.userId as UserId,
        isManagement,
      );

      if (!result.ok) {
        const status = result.error.includes("Not authorized")
          ? 403
          : result.error.includes("not found")
            ? 404
            : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  app.route("/api/reservations", authenticated);

  // --- Admin management routes ---
  const admin = new Hono();
  admin.use("*", getAuthHandler(options));

  // GET /api/admin/reservations
  admin.get(
    "/reservations",
    requireCapability("reservation.manage", "reservation"),
    async (c) => {
      const session = c.get("session")!;
      const reservations = reservationService.listReservations(
        session.organizationId as OrgId,
      );
      return c.json({ data: reservations });
    },
  );

  // POST /api/admin/reservations/:id/override-confirm
  admin.post(
    "/reservations/:id/override-confirm",
    requireCapability("reservation.override", "reservation", {
      extractResource: extractReservationResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = reservationService.overrideConfirm(
        c.req.param("id") as ReservationId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error.includes("not found") ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // POST /api/admin/reservations/override-create
  admin.post(
    "/reservations/override-create",
    requireCapability("reservation.override", "reservation"),
    async (c) => {
      const session = c.get("session")!;
      const parsed = await readJsonBody<{
        userId?: string;
        resourceUnitId?: string;
        startsAt?: string;
        endsAt?: string;
        reason?: string;
      }>(c);
      if (!parsed.ok) return c.json({ error: parsed.error }, 400);
      const body = parsed.value;

      if (!body.userId || typeof body.userId !== "string") {
        return c.json({ error: "userId is required" }, 400);
      }
      if (!body.resourceUnitId || typeof body.resourceUnitId !== "string") {
        return c.json({ error: "resourceUnitId is required" }, 400);
      }
      if (!isValidISODate(body.startsAt)) {
        return c.json({ error: "startsAt must be a valid ISO date" }, 400);
      }
      if (!isValidISODate(body.endsAt)) {
        return c.json({ error: "endsAt must be a valid ISO date" }, 400);
      }
      if (!body.reason || typeof body.reason !== "string") {
        return c.json({ error: "reason is required" }, 400);
      }

      const result = reservationService.createOverrideReservation({
        organizationId: session.organizationId as OrgId,
        userId: body.userId as UserId,
        resourceUnitId: body.resourceUnitId as ResourceUnitId,
        startsAt: body.startsAt!,
        endsAt: body.endsAt!,
      });

      if (!result.ok) return c.json({ error: result.error }, 400);
      return c.json({ data: result.value }, 201);
    },
  );

  app.route("/api/admin", admin);
}

// Export service for testing
export { reservationService, ReservationService };
