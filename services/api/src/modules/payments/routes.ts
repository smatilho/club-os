import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { PaymentService, FakePaymentProvider } from "./service";
import { reservationService } from "../reservations/routes";
import type {
  OrgId,
  UserId,
  ReservationId,
  PaymentTransactionId,
  PaymentTransaction,
} from "@club-os/domain-core";
import { resolveCapabilities, type Role } from "@club-os/auth-rbac";

const fakeProvider = new FakePaymentProvider();
const paymentService = new PaymentService(fakeProvider);

interface PaymentRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
}

function getAuthHandler(options?: PaymentRoutesOptions): MiddlewareHandler {
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

function hasManagementCapability(
  roles: string[],
  capability: string,
): boolean {
  const caps = resolveCapabilities(roles as Role[]);
  return caps.includes(capability as any);
}

function extractPaymentTransactionResource(
  c: Context,
): { id: string; organizationId: string } {
  const id = c.req.param("id") ?? "";
  const txn = paymentService.getTransactionById(id as PaymentTransactionId);
  return {
    id,
    organizationId: txn.ok
      ? txn.value.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function syncReservationFromPaymentResult(
  txn: PaymentTransaction,
): void {
  if (!txn.reservationId) return;
  if (txn.status === "succeeded") {
    reservationService.confirmReservation(
      txn.reservationId,
      txn.organizationId,
      txn.id,
    );
    return;
  }
  if (txn.status === "failed") {
    reservationService.failReservationPayment(txn.reservationId, txn.organizationId);
  }
}

/**
 * Integrated reservation+payment creation endpoint.
 * Called from the reservation routes POST /api/reservations to wire payment.
 */
export async function processReservationPayment(
  reservationId: ReservationId,
  organizationId: OrgId,
  userId: UserId,
  idempotencyKey: string,
): Promise<{ success: boolean; transactionId: PaymentTransactionId | null; error?: string }> {
  const reservation = reservationService.getReservation(
    reservationId,
    organizationId,
  );
  if (!reservation.ok) {
    return { success: false, transactionId: null, error: reservation.error };
  }

  const result = await paymentService.initiatePayment({
    organizationId,
    reservationId,
    userId,
    amount: reservation.value.totalAmount,
    idempotencyKey,
  });

  if (!result.ok) {
    return { success: false, transactionId: null, error: result.error };
  }

  const txn = result.value;

  if (txn.status === "succeeded") {
    reservationService.confirmReservation(
      reservationId,
      organizationId,
      txn.id,
    );
    return { success: true, transactionId: txn.id };
  } else {
    reservationService.failReservationPayment(reservationId, organizationId);
    return {
      success: false,
      transactionId: txn.id,
      error: txn.failureCode ?? "Payment failed",
    };
  }
}

export function paymentRoutes(
  app: Hono,
  options?: PaymentRoutesOptions,
): void {
  // --- Authenticated member/self-service routes ---
  const authenticated = new Hono();
  authenticated.use("*", getAuthHandler(options));

  // GET /api/payments/my
  authenticated.get(
    "/my",
    requireCapability("reservation.read", "payment-transaction"),
    async (c) => {
      const session = c.get("session")!;
      const transactions = paymentService.listMyTransactions(
        session.userId as UserId,
        session.organizationId as OrgId,
      );
      return c.json({ data: transactions });
    },
  );

  // GET /api/payments/transactions/:id
  authenticated.get(
    "/transactions/:id",
    requireCapability("reservation.read", "payment-transaction", {
      extractResource: extractPaymentTransactionResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = paymentService.getTransaction(
        c.req.param("id") as PaymentTransactionId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);

      const txn = result.value;
      // Own transaction or finance/management access
      if (
        txn.userId !== session.userId &&
        !hasManagementCapability(session.roles, "finance.read") &&
        !hasManagementCapability(session.roles, "reservation.manage")
      ) {
        return c.json({ error: "Not authorized" }, 403);
      }

      return c.json({ data: txn });
    },
  );

  app.route("/api/payments", authenticated);

  // --- Webhook route (no auth - dev/test only) ---
  const webhooks = new Hono();

  // POST /api/payments/webhooks/fake
  // Dev/test only - simulated provider webhook callback
  webhooks.post("/fake", async (c) => {
    const parsed = await readJsonBody<{
      providerTransactionId?: string;
      status?: "succeeded" | "failed";
      failureCode?: string;
    }>(c);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const body = parsed.value;

    if (
      !body.providerTransactionId ||
      typeof body.providerTransactionId !== "string"
    ) {
      return c.json(
        { error: "providerTransactionId is required" },
        400,
      );
    }
    if (body.status !== "succeeded" && body.status !== "failed") {
      return c.json(
        { error: "status must be 'succeeded' or 'failed'" },
        400,
      );
    }

    const result = paymentService.processWebhook({
      providerTransactionId: body.providerTransactionId,
      status: body.status,
      failureCode: body.failureCode,
    });

    if (!result.ok) return c.json({ error: result.error }, 404);

    syncReservationFromPaymentResult(result.value);

    return c.json({ data: result.value });
  });

  app.route("/api/payments/webhooks", webhooks);

  // --- Admin routes ---
  const admin = new Hono();
  admin.use("*", getAuthHandler(options));

  // GET /api/admin/payments
  admin.get(
    "/payments",
    requireCapability("finance.read", "payment-transaction"),
    async (c) => {
      const session = c.get("session")!;
      const transactions = paymentService.listTransactions(
        session.organizationId as OrgId,
      );
      return c.json({ data: transactions });
    },
  );

  // POST /api/admin/payments/:id/refund
  admin.post(
    "/payments/:id/refund",
    requireCapability("finance.refund", "payment-transaction", {
      extractResource: extractPaymentTransactionResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = await paymentService.refundPayment(
        c.req.param("id") as PaymentTransactionId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error.includes("not found") ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // POST /api/admin/payments/fake/complete (dev/test helper)
  admin.post(
    "/payments/fake/complete",
    requireCapability("reservation.manage", "payment-transaction"),
    async (c) => {
      const session = c.get("session")!;
      const parsed = await readJsonBody<{
        reservationId?: string;
        status?: "succeeded" | "failed";
      }>(c);
      if (!parsed.ok) return c.json({ error: parsed.error }, 400);
      const body = parsed.value;

      if (!body.reservationId) {
        return c.json({ error: "reservationId is required" }, 400);
      }

      const txn = paymentService.findByReservationId(
        body.reservationId as ReservationId,
        session.organizationId as OrgId,
      );
      if (!txn) {
        return c.json({ error: "Transaction not found for reservation" }, 404);
      }

      if (!txn.providerTransactionId) {
        return c.json({ error: "No provider transaction" }, 400);
      }

      const status = body.status ?? "succeeded";
      const result = paymentService.processWebhook({
        providerTransactionId: txn.providerTransactionId,
        status,
      });

      if (!result.ok) return c.json({ error: result.error }, 400);

      syncReservationFromPaymentResult(result.value);

      return c.json({ data: result.value });
    },
  );

  app.route("/api/admin", admin);
}

// Export for testing
export { paymentService, fakeProvider, PaymentService, FakePaymentProvider };
