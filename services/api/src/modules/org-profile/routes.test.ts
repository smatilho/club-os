import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { orgProfileRoutes, orgProfileService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

const DEFAULT_ORG = "org-default";

function createTestApp() {
  const app = new Hono();
  orgProfileRoutes(app, { auth: "mock", defaultOrgId: DEFAULT_ORG });
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

const validTheme = {
  brandName: "Test Club",
  logoUrl: null,
  primaryColor: "#1a365d",
  accentColor: "#c6a35c",
  surfaceColor: "#f7f5f0",
  textColor: "#1a1a1a",
};

describe("org-profile routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    orgProfileService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  describe("GET /api/org-profile/public/theme", () => {
    it("returns default theme without auth", async () => {
      const res = await app.request("/api/org-profile/public/theme");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.brandName).toBe("Club OS");
      expect(body.data.primaryColor).toBe("#1a365d");
    });

    it("returns updated theme after management update", async () => {
      // Update theme via management route
      await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validTheme,
          brandName: "Updated Club",
        }),
      });

      const res = await app.request("/api/org-profile/public/theme");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.brandName).toBe("Updated Club");
    });
  });

  describe("GET /api/org-profile/theme", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/org-profile/theme");
      expect(res.status).toBe(401);
    });

    it("allows webmaster to read theme (settings.read)", async () => {
      const res = await app.request("/api/org-profile/theme", {
        headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
      });
      expect(res.status).toBe(200);
    });

    it("denies member from reading theme (requires settings.read)", async () => {
      const res = await app.request("/api/org-profile/theme", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/org-profile/theme", () => {
    it("allows org_admin to update theme", async () => {
      const res = await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify(validTheme),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.brandName).toBe("Test Club");
    });

    it("denies webmaster from updating theme (requires settings.manage)", async () => {
      const res = await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify(validTheme),
      });
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid hex color", async () => {
      const res = await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validTheme,
          primaryColor: "not-a-color",
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("hex color");
    });

    it("returns 400 for empty brand name", async () => {
      const res = await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validTheme,
          brandName: "",
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("tenant isolation", () => {
    it("theme is scoped to session org", async () => {
      // Update for org-default
      await app.request("/api/org-profile/theme", {
        method: "PUT",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "org_admin"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validTheme,
          brandName: "Org Default Club",
        }),
      });

      // Read from different org should get default
      const res = await app.request("/api/org-profile/theme", {
        headers: mockHeaders("u2", "org-other", "org_admin"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.brandName).toBe("Club OS"); // default, not "Org Default Club"
    });
  });
});
