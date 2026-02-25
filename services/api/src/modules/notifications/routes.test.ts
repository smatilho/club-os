import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { notificationRoutes, notificationService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";
import type { OrgId } from "@club-os/domain-core";

const DEFAULT_ORG = "org-default";
const OTHER_ORG = "org-other";

function createTestApp() {
  const app = new Hono();
  notificationRoutes(app, { auth: "mock" });
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

describe("notification routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    notificationService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  describe("GET /api/notifications/my", () => {
    it("lists in-app notifications for user", async () => {
      await notificationService.createNotification({
        organizationId: DEFAULT_ORG as OrgId,
        userId: "user-1",
        channel: "in_app",
        topic: "community.report",
        title: "Report Filed",
        body: "A post was reported",
      });

      const res = await app.request("/api/notifications/my", {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe("Report Filed");
    });

    it("returns 401 without auth", async () => {
      const res = await app.request("/api/notifications/my");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/notifications/:id/read", () => {
    it("marks notification as read", async () => {
      const notif = await notificationService.createNotification({
        organizationId: DEFAULT_ORG as OrgId,
        userId: "user-1",
        channel: "in_app",
        topic: "event.published",
        title: "New Event",
        body: "b",
      });

      const res = await app.request(
        `/api/notifications/${notif.id}/read`,
        { method: "POST", headers: memberHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.readAt).toBeTruthy();
    });

    it("returns 404 for other user's notification", async () => {
      const notif = await notificationService.createNotification({
        organizationId: DEFAULT_ORG as OrgId,
        userId: "user-2",
        channel: "in_app",
        topic: "event.published",
        title: "Not Yours",
        body: "b",
      });

      const res = await app.request(
        `/api/notifications/${notif.id}/read`,
        { method: "POST", headers: memberHeaders("user-1") },
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 with tenant mismatch reason code for cross-org notification", async () => {
      const notif = await notificationService.createNotification({
        organizationId: OTHER_ORG as OrgId,
        userId: "user-1",
        channel: "in_app",
        topic: "event.published",
        title: "Other Org",
        body: "b",
      });

      const res = await app.request(
        `/api/notifications/${notif.id}/read`,
        { method: "POST", headers: memberHeaders("user-1", DEFAULT_ORG) },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");

      const deny = auditWriter.entries.find(
        (e) => e.decision.reasonCode === "DENY_RESOURCE_TENANT_MISMATCH",
      );
      expect(deny).toBeTruthy();
    });
  });
});
