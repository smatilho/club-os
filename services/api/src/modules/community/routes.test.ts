import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { communityRoutes, communityService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";
import type { OrgId } from "@club-os/domain-core";
import { NotificationService } from "../notifications/service";

const DEFAULT_ORG = "org-default";
const OTHER_ORG = "org-other";

function createTestApp(notificationService?: NotificationService) {
  const app = new Hono();
  communityRoutes(app, { auth: "mock", notificationService });
  return app;
}

function memberHeaders(
  userId: string = "user-1",
  orgId: string = DEFAULT_ORG,
): Record<string, string> {
  return {
    "x-mock-user-id": userId,
    "x-mock-org-id": orgId,
    "x-mock-roles": "member",
    "content-type": "application/json",
  };
}

function adminHeaders(
  userId: string = "admin-1",
  orgId: string = DEFAULT_ORG,
): Record<string, string> {
  return {
    "x-mock-user-id": userId,
    "x-mock-org-id": orgId,
    "x-mock-roles": "org_admin",
    "content-type": "application/json",
  };
}

describe("community routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;
  let notifService: NotificationService;

  beforeEach(() => {
    communityService.reset();
    notifService = new NotificationService();
    app = createTestApp(notifService);
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Post routes ---

  describe("POST /api/community/posts", () => {
    it("creates a post for authenticated member", async () => {
      const res = await app.request("/api/community/posts", {
        method: "POST",
        headers: memberHeaders(),
        body: JSON.stringify({
          title: "Hello",
          body: "World",
          tags: ["general"],
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.title).toBe("Hello");
      expect(json.data.authorUserId).toBe("user-1");
    });

    it("returns 401 without auth", async () => {
      const res = await app.request("/api/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Hello", body: "World" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 for empty title", async () => {
      const res = await app.request("/api/community/posts", {
        method: "POST",
        headers: memberHeaders(),
        body: JSON.stringify({ title: "", body: "World" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/community/posts", () => {
    it("lists posts for org", async () => {
      communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "P1",
        body: "b",
      });
      communityService.createPost({
        authorUserId: "u1",
        organizationId: OTHER_ORG as OrgId,
        title: "Other",
        body: "b",
      });

      const res = await app.request("/api/community/posts", {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe("P1");
    });

    it("does not list hidden posts for members", async () => {
      const visible = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Visible",
        body: "b",
      });
      const hidden = communityService.createPost({
        authorUserId: "u2",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Hidden",
        body: "b",
      });
      if (!visible.ok || !hidden.ok) throw new Error("fail");
      communityService.hidePost(hidden.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request("/api/community/posts", {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe("Visible");
    });
  });

  describe("GET /api/community/posts/:id", () => {
    it("returns post detail", async () => {
      const created = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Detail",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        { headers: memberHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Detail");
    });

    it("returns 403 with tenant mismatch reason code", async () => {
      const created = communityService.createPost({
        authorUserId: "u1",
        organizationId: OTHER_ORG as OrgId,
        title: "Other",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        { headers: memberHeaders() },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");

      // Audit entry recorded
      expect(auditWriter.entries.length).toBeGreaterThan(0);
      const deny = auditWriter.entries.find(
        (e) => e.decision.reasonCode === "DENY_RESOURCE_TENANT_MISMATCH",
      );
      expect(deny).toBeTruthy();
    });

    it("does not expose hidden post detail to members", async () => {
      const created = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Hidden Detail",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");
      communityService.hidePost(created.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        { headers: memberHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/community/posts/:id", () => {
    it("author can update own post", async () => {
      const created = communityService.createPost({
        authorUserId: "user-1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Original",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        {
          method: "PATCH",
          headers: memberHeaders("user-1"),
          body: JSON.stringify({ title: "Updated" }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Updated");
    });

    it("non-author member gets 403", async () => {
      const created = communityService.createPost({
        authorUserId: "user-1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Original",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        {
          method: "PATCH",
          headers: memberHeaders("user-2"),
          body: JSON.stringify({ title: "Nope" }),
        },
      );
      expect(res.status).toBe(403);
    });

    it("admin/moderator can update any post", async () => {
      const created = communityService.createPost({
        authorUserId: "user-1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Original",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ title: "Moderated" }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Moderated");
    });

    it("returns 400 for validation errors", async () => {
      const created = communityService.createPost({
        authorUserId: "user-1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Original",
        body: "b",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${created.value.id}`,
        {
          method: "PATCH",
          headers: memberHeaders("user-1"),
          body: JSON.stringify({ title: "" }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  // --- Comment routes ---

  describe("POST /api/community/posts/:id/comments", () => {
    it("creates a comment", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${post.value.id}/comments`,
        {
          method: "POST",
          headers: memberHeaders("u2"),
          body: JSON.stringify({ body: "Nice!" }),
        },
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.body).toBe("Nice!");
    });

    it("rejects comment on locked post", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");
      communityService.lockPost(post.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/community/posts/${post.value.id}/comments`,
        {
          method: "POST",
          headers: memberHeaders("u2"),
          body: JSON.stringify({ body: "Denied" }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/community/posts/:id/comments", () => {
    it("lists comments for a post", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      communityService.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: DEFAULT_ORG as OrgId,
        body: "C1",
      });

      const res = await app.request(
        `/api/community/posts/${post.value.id}/comments`,
        { headers: memberHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });
  });

  // --- Report routes ---

  describe("POST /api/community/posts/:id/report", () => {
    it("creates a report for a post", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${post.value.id}/report`,
        {
          method: "POST",
          headers: memberHeaders("u2"),
          body: JSON.stringify({ reasonCode: "spam", details: "It's spam" }),
        },
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.status).toBe("open");
      expect(json.data.reasonCode).toBe("spam");
      const notifications = notifService.listMyNotifications(
        "u2",
        DEFAULT_ORG as OrgId,
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].topic).toBe("community.report");
    });

    it("rejects invalid reasonCode", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/posts/${post.value.id}/report`,
        {
          method: "POST",
          headers: memberHeaders("u2"),
          body: JSON.stringify({ reasonCode: "bad-code" }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/community/comments/:id/report", () => {
    it("creates a report for a comment", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const comment = communityService.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: DEFAULT_ORG as OrgId,
        body: "Bad",
      });
      if (!comment.ok) throw new Error("fail");

      const res = await app.request(
        `/api/community/comments/${comment.value.id}/report`,
        {
          method: "POST",
          headers: memberHeaders("u1"),
          body: JSON.stringify({ reasonCode: "harassment" }),
        },
      );
      expect(res.status).toBe(201);
    });
  });

  // --- Admin moderation routes ---

  describe("GET /api/admin/community/reports", () => {
    it("lists reports for admin", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      communityService.createReport({
        organizationId: DEFAULT_ORG as OrgId,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "spam",
      });

      const res = await app.request("/api/admin/community/reports", {
        headers: adminHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });

    it("returns 403 for member without moderate capability", async () => {
      const res = await app.request("/api/admin/community/reports", {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("report workflow routes", () => {
    async function setupReport() {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const report = communityService.createReport({
        organizationId: DEFAULT_ORG as OrgId,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "abuse",
      });
      if (!report.ok) throw new Error("fail");
      return report.value;
    }

    it("triages a report", async () => {
      const report = await setupReport();
      const res = await app.request(
        `/api/admin/community/reports/${report.id}/triage`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("triaged");
    });

    it("resolves a report", async () => {
      const report = await setupReport();
      const res = await app.request(
        `/api/admin/community/reports/${report.id}/resolve`,
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ notes: "Addressed" }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("resolved");
      expect(json.data.resolutionNotes).toBe("Addressed");
      const notifications = notifService.listMyNotifications(
        "u2",
        DEFAULT_ORG as OrgId,
      );
      expect(
        notifications.some((n) => n.topic === "community.moderation"),
      ).toBe(true);
    });

    it("dismisses a report", async () => {
      const report = await setupReport();
      const res = await app.request(
        `/api/admin/community/reports/${report.id}/dismiss`,
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ notes: "Not valid" }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("dismissed");
    });

    it("tenant mismatch on report detail returns 403 with reason code", async () => {
      const report = await setupReport();
      const res = await app.request(
        `/api/admin/community/reports/${report.id}`,
        { headers: adminHeaders("admin-2", OTHER_ORG) },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });
  });

  // --- Moderation action routes ---

  describe("post moderation actions", () => {
    async function setupPost() {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");
      return post.value;
    }

    it("hides a post", async () => {
      const post = await setupPost();
      const res = await app.request(
        `/api/admin/community/posts/${post.id}/hide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("hidden");

      // Audit entry for moderation action
      const moderateEntries = auditWriter.entries.filter(
        (e) => e.action === "community.moderate",
      );
      expect(moderateEntries.length).toBeGreaterThan(0);
    });

    it("unhides a post", async () => {
      const post = await setupPost();
      communityService.hidePost(post.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/admin/community/posts/${post.id}/unhide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("visible");
    });

    it("locks a post", async () => {
      const post = await setupPost();
      const res = await app.request(
        `/api/admin/community/posts/${post.id}/lock`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("locked");
    });

    it("unlocks a post", async () => {
      const post = await setupPost();
      communityService.lockPost(post.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/admin/community/posts/${post.id}/unlock`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("visible");
    });

    it("member cannot use moderation routes", async () => {
      const post = await setupPost();
      const res = await app.request(
        `/api/admin/community/posts/${post.id}/hide`,
        { method: "POST", headers: memberHeaders() },
      );
      expect(res.status).toBe(403);
    });

    it("tenant mismatch on post moderation returns 403", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: OTHER_ORG as OrgId,
        title: "Other",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const res = await app.request(
        `/api/admin/community/posts/${post.value.id}/hide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });
  });

  describe("comment moderation actions", () => {
    async function setupComment() {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: DEFAULT_ORG as OrgId,
        title: "Post",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const comment = communityService.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: DEFAULT_ORG as OrgId,
        body: "Comment",
      });
      if (!comment.ok) throw new Error("fail");
      return comment.value;
    }

    it("hides a comment", async () => {
      const comment = await setupComment();
      const res = await app.request(
        `/api/admin/community/comments/${comment.id}/hide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("hidden");
    });

    it("unhides a comment", async () => {
      const comment = await setupComment();
      communityService.hideComment(comment.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/admin/community/comments/${comment.id}/unhide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("visible");
    });

    it("tenant mismatch on comment moderation returns 403", async () => {
      const post = communityService.createPost({
        authorUserId: "u1",
        organizationId: OTHER_ORG as OrgId,
        title: "Other",
        body: "b",
      });
      if (!post.ok) throw new Error("fail");

      const comment = communityService.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: OTHER_ORG as OrgId,
        body: "Comment",
      });
      if (!comment.ok) throw new Error("fail");

      const res = await app.request(
        `/api/admin/community/comments/${comment.value.id}/hide`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(403);
    });
  });
});
