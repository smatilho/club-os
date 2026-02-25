import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { eventRoutes, eventService } from "./routes";
import { setAuditWriter } from "../../kernel/policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";
import type { OrgId } from "@club-os/domain-core";

const DEFAULT_ORG = "org-default";
const OTHER_ORG = "org-other";

function createTestApp() {
  const app = new Hono();
  eventRoutes(app, { auth: "mock" });
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

const validEvent = {
  title: "Club Meetup",
  description: "Monthly get-together",
  startsAt: "2026-06-15T18:00:00Z",
  endsAt: "2026-06-15T21:00:00Z",
  location: "Clubhouse",
  capacity: 30,
};

describe("event routes", () => {
  let app: Hono;
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    eventService.reset();
    app = createTestApp();
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  // --- Admin routes ---

  describe("POST /api/admin/events", () => {
    it("creates a draft event", async () => {
      const res = await app.request("/api/admin/events", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(validEvent),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.status).toBe("draft");
      expect(json.data.title).toBe("Club Meetup");
    });

    it("returns 403 for member", async () => {
      const res = await app.request("/api/admin/events", {
        method: "POST",
        headers: memberHeaders(),
        body: JSON.stringify(validEvent),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/events/:id", () => {
    it("updates an event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/admin/events/${created.value.id}`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ title: "Updated Meetup" }),
        },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Updated Meetup");
    });
  });

  describe("POST /api/admin/events/:id/publish", () => {
    it("publishes a draft event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/admin/events/${created.value.id}/publish`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("published");
    });
  });

  describe("POST /api/admin/events/:id/cancel", () => {
    it("cancels a published event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/admin/events/${created.value.id}/cancel`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("canceled");
    });
  });

  describe("GET /api/admin/events", () => {
    it("lists all events including drafts", async () => {
      eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });

      const res = await app.request("/api/admin/events", {
        headers: adminHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });
  });

  describe("GET /api/admin/events/:id/rsvps", () => {
    it("lists RSVPs for an event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);
      eventService.rsvp(created.value.id, "u1", DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/admin/events/${created.value.id}/rsvps`,
        { headers: adminHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });
  });

  // --- Member routes ---

  describe("GET /api/events", () => {
    it("lists only published events for members", async () => {
      // Create draft
      eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      // Create and publish
      const published = eventService.createEvent({
        ...validEvent,
        title: "Published Event",
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (published.ok)
        eventService.publishEvent(
          published.value.id,
          DEFAULT_ORG as OrgId,
        );

      const res = await app.request("/api/events", {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe("Published Event");
    });
  });

  describe("GET /api/events/:id", () => {
    it("returns published event detail for members", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request(`/api/events/${created.value.id}`, {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(created.value.id);
    });

    it("does not expose draft event detail to members", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(`/api/events/${created.value.id}`, {
        headers: memberHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/events/:id/rsvp", () => {
    it("creates RSVP for published event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/events/${created.value.id}/rsvp`,
        { method: "POST", headers: memberHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("going");
    });

    it("rejects RSVP for draft event", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/events/${created.value.id}/rsvp`,
        { method: "POST", headers: memberHeaders() },
      );
      expect(res.status).toBe(400);
    });

    it("waitlists when full", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        capacity: 1,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);
      eventService.rsvp(created.value.id, "u1", DEFAULT_ORG as OrgId);

      const res = await app.request(
        `/api/events/${created.value.id}/rsvp`,
        { method: "POST", headers: memberHeaders("u2") },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("waitlist");
    });
  });

  describe("POST /api/events/:id/rsvp/cancel", () => {
    it("cancels RSVP", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: DEFAULT_ORG as OrgId,
        createdByUserId: "admin-1",
      });
      if (!created.ok) throw new Error("fail");
      eventService.publishEvent(created.value.id, DEFAULT_ORG as OrgId);
      eventService.rsvp(
        created.value.id,
        "user-1",
        DEFAULT_ORG as OrgId,
      );

      const res = await app.request(
        `/api/events/${created.value.id}/rsvp/cancel`,
        { method: "POST", headers: memberHeaders() },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("canceled");
    });
  });

  // --- Tenant isolation ---

  describe("tenant isolation", () => {
    it("tenant mismatch on event detail returns 403", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: OTHER_ORG as OrgId,
        createdByUserId: "admin-2",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/events/${created.value.id}`,
        { headers: memberHeaders() },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    });

    it("admin tenant mismatch returns 403", async () => {
      const created = eventService.createEvent({
        ...validEvent,
        organizationId: OTHER_ORG as OrgId,
        createdByUserId: "admin-2",
      });
      if (!created.ok) throw new Error("fail");

      const res = await app.request(
        `/api/admin/events/${created.value.id}/publish`,
        { method: "POST", headers: adminHeaders() },
      );
      expect(res.status).toBe(403);
    });
  });
});
