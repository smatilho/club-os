import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { contentRoutes, contentService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

const DEFAULT_ORG = "org-default";

function createTestApp() {
  const app = new Hono();
  contentRoutes(app, { auth: "mock", defaultOrgId: DEFAULT_ORG });
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

describe("content routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    contentService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Public routes ---

  describe("GET /api/content/public/pages/:slugPath", () => {
    it("returns 404 for draft-only page", async () => {
      // Create a page via service directly (as management would)
      contentService.createPage({
        title: "Draft Page",
        slug: "draft-page",
        body: "body",
        organizationId: DEFAULT_ORG as any,
      });

      const res = await app.request("/api/content/public/pages/draft-page");
      expect(res.status).toBe(404);
    });

    it("returns published page after publish", async () => {
      const createResult = contentService.createPage({
        title: "About",
        slug: "about",
        body: "Published content",
        organizationId: DEFAULT_ORG as any,
      });
      if (!createResult.ok) throw new Error("create failed");
      contentService.publish(createResult.value.id, DEFAULT_ORG as any);

      const res = await app.request("/api/content/public/pages/about");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.title).toBe("About");
      expect(body.data.body).toBe("Published content");
      expect(body.data.slug).toBe("about");
      expect(body.data.publishedAt).toBeDefined();
    });

    it("supports nested slug paths", async () => {
      const createResult = contentService.createPage({
        title: "History",
        slug: "about/history",
        body: "Our history",
        organizationId: DEFAULT_ORG as any,
      });
      if (!createResult.ok) throw new Error("create failed");
      contentService.publish(createResult.value.id, DEFAULT_ORG as any);

      const res = await app.request(
        "/api/content/public/pages/about/history",
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.slug).toBe("about/history");
    });

    it("returns 404 for non-existent page", async () => {
      const res = await app.request("/api/content/public/pages/not-found");
      expect(res.status).toBe(404);
    });

    it("serves published snapshot, not updated draft", async () => {
      const createResult = contentService.createPage({
        title: "About",
        slug: "about",
        body: "Original",
        organizationId: DEFAULT_ORG as any,
      });
      if (!createResult.ok) throw new Error("create failed");
      contentService.publish(createResult.value.id, DEFAULT_ORG as any);
      contentService.updateDraft(createResult.value.id, DEFAULT_ORG as any, {
        body: "Updated draft",
      });

      const res = await app.request("/api/content/public/pages/about");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.body).toBe("Original");
    });
  });

  // --- Management routes ---

  describe("authentication", () => {
    it("returns 401 without auth headers for management routes", async () => {
      const res = await app.request("/api/content/pages");
      expect(res.status).toBe(401);
    });
  });

  describe("authorization", () => {
    it("allows member to list pages (content.read)", async () => {
      const res = await app.request("/api/content/pages", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(200);
    });

    it("denies member from creating page (requires content.write)", async () => {
      const res = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Test",
          slug: "test",
          body: "body",
        }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });

    it("allows webmaster to create page", async () => {
      const res = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "New Page",
          slug: "new-page",
          body: "content",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.draft.title).toBe("New Page");
    });

    it("denies webmaster from publishing (webmaster has content.publish)", async () => {
      // webmaster has content.publish per RBAC matrix
      const createRes = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Pub Page",
          slug: "pub-page",
          body: "content",
        }),
      });
      const created = await createRes.json();
      const pageId = created.data.id;

      const pubRes = await app.request(
        `/api/content/pages/${pageId}/publish`,
        {
          method: "POST",
          headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
        },
      );
      expect(pubRes.status).toBe(200);
    });

    it("denies member from publishing (requires content.publish)", async () => {
      // Create via service directly
      const createResult = contentService.createPage({
        title: "Page",
        slug: "publish-test",
        body: "body",
        organizationId: DEFAULT_ORG as any,
      });
      if (!createResult.ok) throw new Error("create failed");

      const res = await app.request(
        `/api/content/pages/${createResult.value.id}/publish`,
        {
          method: "POST",
          headers: mockHeaders("u1", DEFAULT_ORG, "member"),
        },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
    });
  });

  describe("POST /api/content/pages", () => {
    it("creates a page and returns detail", async () => {
      const res = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "About Us",
          slug: "about-us",
          body: "Welcome to our club",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.status).toBe("draft");
      expect(body.data.published).toBeNull();
      expect(body.data.version).toBe(1);
    });

    it("returns 400 for invalid slug", async () => {
      const res = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Test",
          slug: "Invalid Slug",
          body: "body",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for duplicate slug", async () => {
      await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Page 1",
          slug: "same-slug",
          body: "body",
        }),
      });

      const res = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Page 2",
          slug: "same-slug",
          body: "body",
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("slug already exists");
    });
  });

  describe("PATCH /api/content/pages/:id", () => {
    it("updates draft fields", async () => {
      const createRes = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "About",
          slug: "about",
          body: "body",
        }),
      });
      const created = await createRes.json();
      const pageId = created.data.id;

      const res = await app.request(`/api/content/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "About Us" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.draft.title).toBe("About Us");
      expect(body.data.version).toBe(2);
    });

    it("returns 404 when page does not exist", async () => {
      const res = await app.request("/api/content/pages/page-missing", {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "Missing" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/content/pages", () => {
    it("returns list of pages as summaries", async () => {
      await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Page 1",
          slug: "page-1",
          body: "body",
        }),
      });

      const res = await app.request("/api/content/pages", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Page 1");
      expect(body.data[0].status).toBe("draft");
      expect(body.data[0].publishedSlug).toBeNull();
    });
  });

  describe("GET /api/content/pages/:id", () => {
    it("returns page detail", async () => {
      const createRes = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "About",
          slug: "about",
          body: "About body",
        }),
      });
      const created = await createRes.json();
      const pageId = created.data.id;

      const res = await app.request(`/api/content/pages/${pageId}`, {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.draft.title).toBe("About");
      expect(body.data.draft.body).toBe("About body");
    });
  });

  describe("POST /api/content/pages/:id/publish", () => {
    it("returns 404 when page does not exist", async () => {
      const res = await app.request("/api/content/pages/page-missing/publish", {
        method: "POST",
        headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("tenant isolation on routes", () => {
    it("denies cross-tenant access to page detail with tenant-mismatch reason code", async () => {
      // Create page in org-default
      const createRes = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Secret Page",
          slug: "secret",
          body: "secret content",
        }),
      });
      const created = await createRes.json();
      const pageId = created.data.id;

      // Try to access from different org
      const res = await app.request(`/api/content/pages/${pageId}`, {
        headers: mockHeaders("u2", "org-other", "webmaster"),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
      expect(auditWriter.entries.at(-1)?.decision.effect).toBe("deny");
      expect(auditWriter.entries.at(-1)?.decision.reasonCode).toBe(
        "DENY_RESOURCE_TENANT_MISMATCH",
      );
    });

    it("list pages only returns pages for session org", async () => {
      // Create page in org-default
      await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Default Org Page",
          slug: "default-page",
          body: "body",
        }),
      });

      // List from different org
      const res = await app.request("/api/content/pages", {
        headers: mockHeaders("u2", "org-other", "member"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });

  describe("audit logging", () => {
    it("logs allow decisions for management reads", async () => {
      await app.request("/api/content/pages", {
        headers: mockHeaders("u1", DEFAULT_ORG, "member"),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("allow");
    });

    it("logs deny decisions for unauthorized writes", async () => {
      await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "member"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Test",
          slug: "test",
          body: "body",
        }),
      });
      expect(auditWriter.entries).toHaveLength(1);
      expect(auditWriter.entries[0].decision.effect).toBe("deny");
    });
  });

  describe("full publish lifecycle", () => {
    it("create -> edit -> publish -> public read -> edit draft -> public still shows published", async () => {
      // 1. Create
      const createRes = await app.request("/api/content/pages", {
        method: "POST",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Lifecycle Page",
          slug: "lifecycle",
          body: "Initial content",
        }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      const pageId = created.data.id;

      // 2. Edit draft
      const editRes = await app.request(`/api/content/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ body: "Edited content" }),
      });
      expect(editRes.status).toBe(200);

      // 3. Publish
      const pubRes = await app.request(
        `/api/content/pages/${pageId}/publish`,
        {
          method: "POST",
          headers: mockHeaders("u1", DEFAULT_ORG, "webmaster"),
        },
      );
      expect(pubRes.status).toBe(200);
      const published = await pubRes.json();
      expect(published.data.status).toBe("published");
      expect(published.data.published.body).toBe("Edited content");

      // 4. Public read
      const publicRes = await app.request(
        "/api/content/public/pages/lifecycle",
      );
      expect(publicRes.status).toBe(200);
      const publicBody = await publicRes.json();
      expect(publicBody.data.body).toBe("Edited content");

      // 5. Edit draft again
      await app.request(`/api/content/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          ...mockHeaders("u1", DEFAULT_ORG, "webmaster"),
          "content-type": "application/json",
        },
        body: JSON.stringify({ body: "Post-publish draft edit" }),
      });

      // 6. Public still shows published content
      const publicRes2 = await app.request(
        "/api/content/public/pages/lifecycle",
      );
      expect(publicRes2.status).toBe(200);
      const publicBody2 = await publicRes2.json();
      expect(publicBody2.data.body).toBe("Edited content");
    });
  });
});
