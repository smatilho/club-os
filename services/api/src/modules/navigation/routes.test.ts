import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { navigationRoutes, navigationService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

const DEFAULT_ORG = "org-default";

function createTestApp() {
  const app = new Hono();
  navigationRoutes(app, { auth: "mock", defaultOrgId: DEFAULT_ORG });
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

describe("navigation routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    navigationService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Public routes ---

  describe("GET /api/navigation/menus/:location", () => {
    it("returns empty array when no items", async () => {
      const res = await app.request("/api/navigation/menus/public_header");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
    });

    it("returns items for location", async () => {
      navigationService.createItem({
        organizationId: DEFAULT_ORG as any,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });

      const res = await app.request("/api/navigation/menus/public_header");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].label).toBe("About");
    });

    it("filters out authenticated-only items for public access", async () => {
      navigationService.createItem({
        organizationId: DEFAULT_ORG as any,
        location: "public_header",
        label: "Public Item",
        linkType: "internal_path",
        linkTarget: "/public-item",
        visibility: "always",
      });
      navigationService.createItem({
        organizationId: DEFAULT_ORG as any,
        location: "public_header",
        label: "Auth Only",
        linkType: "internal_path",
        linkTarget: "/auth-only",
        visibility: "authenticated",
      });

      const res = await app.request("/api/navigation/menus/public_header");
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].label).toBe("Public Item");
    });

    it("returns 400 for invalid location", async () => {
      const res = await app.request("/api/navigation/menus/invalid");
      expect(res.status).toBe(400);
    });
  });

  // --- Admin routes ---

  describe("authentication", () => {
    it("returns 401 without auth headers", async () => {
      const res = await app.request("/api/admin/navigation/menus");
      expect(res.status).toBe(401);
    });
  });

  describe("authorization", () => {
    it("allows member to read menus (navigation.read)", async () => {
      const res = await app.request("/api/admin/navigation/menus", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(200);
    });

    it("denies member from creating menu item (requires navigation.write)", async () => {
      const res = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "Test",
          linkType: "internal_path",
          linkTarget: "/test",
        }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("allows webmaster to create menu item", async () => {
      const res = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "About",
          linkType: "internal_path",
          linkTarget: "/about",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.label).toBe("About");
    });
  });

  describe("POST /api/admin/navigation/menu-items", () => {
    it("returns 400 for missing label", async () => {
      const res = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "",
          linkType: "internal_path",
          linkTarget: "/test",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid location", async () => {
      const res = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "invalid",
          label: "Test",
          linkType: "internal_path",
          linkTarget: "/test",
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/admin/navigation/menu-items/:id", () => {
    it("updates menu item", async () => {
      const createRes = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "About",
          linkType: "internal_path",
          linkTarget: "/about",
        }),
      });
      const created = await createRes.json();
      const itemId = created.data.id;

      const res = await app.request(`/api/admin/navigation/menu-items/${itemId}`, {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ label: "About Us" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.label).toBe("About Us");
    });

    it("returns 404 for non-existent item", async () => {
      const res = await app.request("/api/admin/navigation/menu-items/missing-id", {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ label: "Test" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/navigation/menu-items/:id", () => {
    it("deletes menu item", async () => {
      const createRes = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "About",
          linkType: "internal_path",
          linkTarget: "/about",
        }),
      });
      const created = await createRes.json();
      const itemId = created.data.id;

      const res = await app.request(`/api/admin/navigation/menu-items/${itemId}`, {
        method: "DELETE",
        headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.deleted).toBe(true);
    });

    it("returns 404 for non-existent item", async () => {
      const res = await app.request("/api/admin/navigation/menu-items/missing-id", {
        method: "DELETE",
        headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("tenant isolation", () => {
    it("denies cross-tenant access to menu item update", async () => {
      const createRes = await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "About",
          linkType: "internal_path",
          linkTarget: "/about",
        }),
      });
      const created = await createRes.json();
      const itemId = created.data.id;

      const res = await app.request(`/api/admin/navigation/menu-items/${itemId}`, {
        method: "PATCH",
        headers: {
          ...mockHeaders("u2", "org-other", "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ label: "Hacked" }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });

    it("admin list only returns items for session org", async () => {
      navigationService.createItem({
        organizationId: DEFAULT_ORG as any,
        location: "public_header",
        label: "Default Org Item",
        linkType: "internal_path",
        linkTarget: "/default",
      });

      const res = await app.request("/api/admin/navigation/menus", {
        headers: mockHeaders("u2", "org-other", "member"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });

  describe("audit logging", () => {
    it("logs allow decisions for admin reads", async () => {
      await app.request("/api/admin/navigation/menus", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("allow");
    });

    it("logs deny decisions for unauthorized writes", async () => {
      await app.request("/api/admin/navigation/menu-items", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: "public_header",
          label: "Test",
          linkType: "internal_path",
          linkTarget: "/test",
        }),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("deny");
    });
  });
});
