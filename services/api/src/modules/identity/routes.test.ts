import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { identityRoutes, identityService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

/**
 * Creates a fresh Hono app with identity routes and a clean service.
 * We re-import to get fresh state per test file, but the module-level
 * service is shared within a test run. For route tests we test the
 * HTTP-level behavior including auth and policy enforcement.
 */

function createTestApp() {
  const app = new Hono();
  identityRoutes(app, { auth: "mock" });
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

describe("identity routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    identityService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  describe("authentication", () => {
    it("returns 401 without auth headers", async () => {
      const res = await app.request("/api/identity/memberships");
      expect(res.status).toBe(401);
    });

    it("returns 401 with partial auth headers", async () => {
      const res = await app.request("/api/identity/memberships", {
        headers: { "x-mock-user-id": "u1" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("authorization", () => {
    it("allows member to read memberships (membership.read)", async () => {
      const res = await app.request("/api/identity/memberships", {
        headers: mockHeaders("u1", "org1", "member"),
      });
      expect(res.status).toBe(200);
    });

    it("denies member from creating membership (requires membership.manage)", async () => {
      const res = await app.request("/api/identity/memberships", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org1", "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "u2", roles: ["member"] }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("allows org_admin to create membership", async () => {
      const res = await app.request("/api/identity/memberships", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org1", "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "u2", roles: ["member"] }),
      });
      // May be 400 (user not found in in-memory store) but NOT 401/403
      expect([201, 400]).toContain(res.status);
    });

    it("returns 400 for invalid membership role payload", async () => {
      const res = await app.request("/api/identity/memberships", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org1", "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "u2", roles: ["not_a_role"] }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("invalid role");
    });

    it("returns 400 when create membership payload includes platform_admin", async () => {
      const res = await app.request("/api/identity/memberships", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org1", "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "u2", roles: ["platform_admin"] }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("invalid role");
    });
  });

  describe("audit logging", () => {
    it("logs allow decisions", async () => {
      await app.request("/api/identity/memberships", {
        headers: mockHeaders("u1", "org1", "member"),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("allow");
      expect(auditWriter.entries[0].actor.userId).toBe("u1");
    });

    it("logs deny decisions", async () => {
      await app.request("/api/identity/memberships", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", "org1", "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "u2", roles: ["member"] }),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("deny");
      expect(auditWriter.entries[0].decision.reasonCode).toBe(
        "DENY_CAPABILITY_MISSING",
      );
    });

    it("logs tenant-mismatch deny decisions for resource routes", async () => {
      const user = identityService.createUser({
        email: "tenant@test.dev",
        displayName: "Tenant User",
      });
      const org1 = identityService.createOrganization({
        slug: "org-one",
        name: "Org One",
        timezone: "UTC",
      });
      const org2 = identityService.createOrganization({
        slug: "org-two",
        name: "Org Two",
        timezone: "UTC",
      });
      if (!user.ok || !org1.ok || !org2.ok) {
        throw new Error("setup failed");
      }
      const membership = identityService.createMembership({
        userId: user.value.id,
        organizationId: org2.value.id,
        roles: ["member"],
      });
      if (!membership.ok) {
        throw new Error("setup failed");
      }

      const res = await app.request(`/api/identity/memberships/${membership.value.id}`, {
        headers: mockHeaders("admin-1", org1.value.id, "org_admin"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.reasonCode).toBe(
        "DENY_RESOURCE_TENANT_MISMATCH",
      );
      expect(auditWriter.entries[0].resource.organizationId).toBe(org2.value.id);
    });
  });

  describe("role assignment validation", () => {
    it("returns 400 when assigning platform_admin to a membership", async () => {
      const user = identityService.createUser({
        email: "member@test.dev",
        displayName: "Member User",
      });
      const org = identityService.createOrganization({
        slug: "role-validation",
        name: "Role Validation Org",
        timezone: "UTC",
      });
      if (!user.ok || !org.ok) {
        throw new Error("setup failed");
      }
      const membership = identityService.createMembership({
        userId: user.value.id,
        organizationId: org.value.id,
        roles: ["member"],
      });
      if (!membership.ok) {
        throw new Error("setup failed");
      }

      const res = await app.request(`/api/identity/memberships/${membership.value.id}/roles`, {
        method: "POST",
        headers: {
          ...mockHeaders("admin-1", org.value.id, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: "platform_admin" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("valid role name");
    });
  });
});
