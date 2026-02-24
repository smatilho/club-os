import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { reservationRoutes, reservationService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

const DEFAULT_ORG = "org-default";

function createTestApp() {
  const app = new Hono();
  reservationRoutes(app, { auth: "mock", defaultOrgId: DEFAULT_ORG });
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

const STARTS = "2026-03-01T10:00:00.000Z";
const ENDS = "2026-03-01T12:00:00.000Z";

describe("reservation routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    reservationService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Availability ---

  describe("GET /api/reservations/availability", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
      );
      expect(res.status).toBe(401);
    });

    it("returns available resources for member", async () => {
      const res = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].available).toBe(true);
    });

    it("returns 400 for missing params", async () => {
      const res = await app.request("/api/reservations/availability", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid date range", async () => {
      const res = await app.request(
        `/api/reservations/availability?startsAt=${ENDS}&endsAt=${STARTS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      expect(res.status).toBe(400);
    });
  });

  // --- Holds ---

  describe("POST /api/reservations/holds", () => {
    it("creates a hold for member", async () => {
      // First get a resource ID
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const availBody = await availRes.json();
      const resourceId = availBody.data[0].resourceUnitId;

      const res = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: resourceId,
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.status).toBe("held");
    });

    it("returns 400 for invalid date range", async () => {
      const res = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: "some-id",
          startsAt: ENDS,
          endsAt: STARTS,
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resourceUnitId: "some-id",
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/reservations/holds/:id", () => {
    it("returns hold for owner", async () => {
      // Create a hold first
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const createRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: resourceId,
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      const holdId = (await createRes.json()).data.id;

      const res = await app.request(`/api/reservations/holds/${holdId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
    });

    it("returns 403 for different user without management role", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const createRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: resourceId,
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      const holdId = (await createRes.json()).data.id;

      const res = await app.request(`/api/reservations/holds/${holdId}`, {
        headers: mockHeaders("u2", DEFAULT_ORG),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/reservations/holds/:id/release", () => {
    it("releases own hold", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const createRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: resourceId,
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      const holdId = (await createRes.json()).data.id;

      const res = await app.request(
        `/api/reservations/holds/${holdId}/release`,
        {
          method: "POST",
          headers: mockHeaders("u1", DEFAULT_ORG),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("released");
    });
  });

  // --- Reservations ---

  describe("POST /api/reservations", () => {
    it("creates reservation from hold", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          resourceUnitId: resourceId,
          startsAt: STARTS,
          endsAt: ENDS,
        }),
      });
      const holdId = (await holdRes.json()).data.id;

      const res = await app.request("/api/reservations", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "test-key-1",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.status).toBe("payment_pending");
    });

    it("returns 400 without holdId", async () => {
      const res = await app.request("/api/reservations", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: "test-key-2",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 without idempotencyKey", async () => {
      const res = await app.request("/api/reservations", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId: "some-hold",
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/reservations/my", () => {
    it("returns only user's reservations", async () => {
      const res = await app.request("/api/reservations/my", {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/reservations/:id", () => {
    it("returns own reservation", async () => {
      // Create a reservation
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "detail-key",
        }),
      });
      const resId = (await createRes.json()).data.id;

      const res = await app.request(`/api/reservations/${resId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG),
      });
      expect(res.status).toBe(200);
    });

    it("returns 403 for different user without management role", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "other-user-key",
        }),
      });
      const resId = (await createRes.json()).data.id;

      const res = await app.request(`/api/reservations/${resId}`, {
        headers: mockHeaders("u2", DEFAULT_ORG),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/reservations/:id/cancel", () => {
    it("cancels own payment_pending reservation", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "cancel-key",
        }),
      });
      const resId = (await createRes.json()).data.id;

      const res = await app.request(
        `/api/reservations/${resId}/cancel`,
        {
          method: "POST",
          headers: {
            ...mockHeaders("u1", DEFAULT_ORG),
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("canceled");
    });
  });

  // --- Admin Routes ---

  describe("GET /api/admin/reservations", () => {
    it("returns 403 for member without reservation.manage", async () => {
      const res = await app.request("/api/admin/reservations", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("returns reservations for reservationist", async () => {
      const res = await app.request("/api/admin/reservations", {
        headers: mockHeaders("u1", DEFAULT_ORG, "reservationist"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns reservations for org_admin", async () => {
      const res = await app.request("/api/admin/reservations", {
        headers: mockHeaders("u1", DEFAULT_ORG, "org_admin"),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/admin/reservations/:id/override-confirm", () => {
    it("returns 403 for member", async () => {
      const res = await app.request(
        "/api/admin/reservations/fake-id/override-confirm",
        {
          method: "POST",
          headers: mockHeaders("u1", DEFAULT_ORG, "member"),
        },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("override-confirms a reservation for reservationist", async () => {
      // Create a reservation first
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "override-key",
        }),
      });
      const resId = (await createRes.json()).data.id;

      const res = await app.request(
        `/api/admin/reservations/${resId}/override-confirm`,
        {
          method: "POST",
          headers: mockHeaders("admin1", DEFAULT_ORG, "reservationist"),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("confirmed");
    });
  });

  describe("POST /api/admin/reservations/override-create", () => {
    it("returns 403 for member", async () => {
      const res = await app.request(
        "/api/admin/reservations/override-create",
        {
          method: "POST",
          headers: {
            ...mockHeaders("u1", DEFAULT_ORG, "member"),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            userId: "u2",
            resourceUnitId: "some-id",
            startsAt: STARTS,
            endsAt: ENDS,
            reason: "test",
          }),
        },
      );
      expect(res.status).toBe(403);
    });

    it("creates override reservation for reservationist", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const res = await app.request(
        "/api/admin/reservations/override-create",
        {
          method: "POST",
          headers: {
            ...mockHeaders("admin1", DEFAULT_ORG, "reservationist"),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            userId: "u2",
            resourceUnitId: resourceId,
            startsAt: STARTS,
            endsAt: ENDS,
            reason: "Walk-in guest override",
          }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.status).toBe("confirmed");
      expect(body.data.source).toBe("admin_override");
    });

    it("returns 400 without reason", async () => {
      const res = await app.request(
        "/api/admin/reservations/override-create",
        {
          method: "POST",
          headers: {
            ...mockHeaders("admin1", DEFAULT_ORG, "reservationist"),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            userId: "u2",
            resourceUnitId: "some-id",
            startsAt: STARTS,
            endsAt: ENDS,
          }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  // --- Tenant Isolation on Routes ---

  describe("tenant isolation on routes", () => {
    it("cannot access reservations from different org", async () => {
      // Create reservation in default org
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "tenant-test",
        }),
      });
      const resId = (await createRes.json()).data.id;

      // Try to access from different org
      const res = await app.request(`/api/reservations/${resId}`, {
        headers: mockHeaders("u1", "org-other"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });

    it("returns tenant mismatch deny for cross-tenant cancel attempt", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "tenant-cancel-test",
        }),
      });
      const resId = (await createRes.json()).data.id;

      const res = await app.request(`/api/reservations/${resId}/cancel`, {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org-other"),
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });
  });

  // --- Audit Logging ---

  describe("audit logging", () => {
    it("logs allow decisions for member reservation reads", async () => {
      await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      expect(auditWriter.entries.length).toBeGreaterThan(0);
      expect(auditWriter.entries[0].decision.effect).toBe("allow");
    });

    it("logs deny decisions for unauthorized admin access", async () => {
      await app.request("/api/admin/reservations", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      const denyEntry = auditWriter.entries.find(
        (e) => e.decision.effect === "deny",
      );
      expect(denyEntry).toBeDefined();
      expect(denyEntry!.decision.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("logs tenant mismatch denies for cross-tenant reservation access", async () => {
      const availRes = await app.request(
        `/api/reservations/availability?startsAt=${STARTS}&endsAt=${ENDS}`,
        { headers: mockHeaders("u1", DEFAULT_ORG) },
      );
      const resourceId = (await availRes.json()).data[0].resourceUnitId;

      const holdRes = await app.request("/api/reservations/holds", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG),
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
          ...mockHeaders("u1", DEFAULT_ORG),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          idempotencyKey: "audit-tenant-mismatch",
        }),
      });
      const resId = (await createRes.json()).data.id;

      await app.request(`/api/reservations/${resId}`, {
        headers: mockHeaders("u1", "org-other"),
      });

      const denyEntry = auditWriter.entries.find(
        (e) => e.decision.reasonCode === "DENY_RESOURCE_TENANT_MISMATCH",
      );
      expect(denyEntry).toBeDefined();
    });
  });
});
