import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { EventService } from "./service";
import type { ClubEventId, OrgId } from "@club-os/domain-core";
import type { NotificationService } from "../notifications/service";

const eventService = new EventService();

interface EventRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  notificationService?: NotificationService;
}

function getEventAuthHandler(
  options?: EventRoutesOptions,
): MiddlewareHandler {
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

function extractEventResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const event = eventService.getEventUnscoped(id as ClubEventId);
  return {
    id,
    organizationId: event
      ? event.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function isMemberVisibleEvent(event: {
  status: string;
  publishedAt: string | null;
}): boolean {
  if (event.status === "published") return true;
  return event.status === "canceled" && event.publishedAt !== null;
}

export function eventRoutes(
  app: Hono,
  options?: EventRoutesOptions,
): void {
  const notifService = options?.notificationService;

  // --- Member routes ---
  const member = new Hono();
  member.use("*", getEventAuthHandler(options));

  // List published events for members
  member.get(
    "/",
    requireCapability("events.read", "club-event"),
    async (c) => {
      const session = c.get("session")!;
      const events = eventService.listEvents(
        session.organizationId as OrgId,
        false,
      );
      return c.json({ data: events });
    },
  );

  // Get event detail
  member.get(
    "/:id",
    requireCapability("events.read", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = eventService.getEvent(
        c.req.param("id") as ClubEventId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);
      if (!isMemberVisibleEvent(result.value)) {
        return c.json({ error: "Event not found" }, 404);
      }
      return c.json({ data: result.value });
    },
  );

  // RSVP to event
  member.post(
    "/:id/rsvp",
    requireCapability("events.read", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = eventService.rsvp(
        c.req.param("id") as ClubEventId,
        session.userId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Event not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }

      // Notify event organizer
      if (notifService) {
        const event = eventService.getEventUnscoped(
          c.req.param("id") as ClubEventId,
        );
        if (event) {
          try {
            await notifService.createNotification({
              organizationId: session.organizationId as OrgId,
              userId: event.createdByUserId,
              channel: "in_app",
              topic: "event.rsvp",
              title: "New RSVP",
              body: `${session.userId} RSVP'd to "${event.title}"`,
              metadata: {
                eventId: event.id,
                rsvpUserId: session.userId,
              },
            });
          } catch {
            // Channel failure does not break primary action
          }
        }
      }

      return c.json({ data: result.value });
    },
  );

  // Cancel RSVP
  member.post(
    "/:id/rsvp/cancel",
    requireCapability("events.read", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = eventService.cancelRSVP(
        c.req.param("id") as ClubEventId,
        session.userId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Event not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // My RSVPs
  member.get(
    "/my/rsvps",
    requireCapability("events.read", "club-event"),
    async (c) => {
      const session = c.get("session")!;
      const rsvps = eventService.listMyRSVPs(
        session.userId,
        session.organizationId as OrgId,
      );
      return c.json({ data: rsvps });
    },
  );

  app.route("/api/events", member);

  // --- Admin routes ---
  const admin = new Hono();
  admin.use("*", getEventAuthHandler(options));

  // List all events (including drafts)
  admin.get(
    "/events",
    requireCapability("events.manage", "club-event"),
    async (c) => {
      const session = c.get("session")!;
      const events = eventService.listEvents(
        session.organizationId as OrgId,
        true,
      );
      return c.json({ data: events });
    },
  );

  // Create event
  admin.post(
    "/events",
    requireCapability("events.write", "club-event"),
    async (c) => {
      const parsedBody = await readJsonBody<{
        title?: string;
        description?: string;
        startsAt?: string;
        endsAt?: string;
        location?: string | null;
        capacity?: number | null;
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = eventService.createEvent({
        organizationId: session.organizationId as OrgId,
        createdByUserId: session.userId,
        title: parsedBody.value.title ?? "",
        description: parsedBody.value.description ?? "",
        startsAt: parsedBody.value.startsAt ?? "",
        endsAt: parsedBody.value.endsAt ?? "",
        location: parsedBody.value.location,
        capacity: parsedBody.value.capacity,
      });
      if (!result.ok) return c.json({ error: result.error }, 400);
      return c.json({ data: result.value }, 201);
    },
  );

  // Update event
  admin.patch(
    "/events/:id",
    requireCapability("events.write", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{
        title?: string;
        description?: string;
        startsAt?: string;
        endsAt?: string;
        location?: string | null;
        capacity?: number | null;
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = eventService.updateEvent(
        c.req.param("id") as ClubEventId,
        session.organizationId as OrgId,
        parsedBody.value,
      );
      if (!result.ok) {
        const status = result.error === "Event not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // Publish event
  admin.post(
    "/events/:id/publish",
    requireCapability("events.publish", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = eventService.publishEvent(
        c.req.param("id") as ClubEventId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Event not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }

      // Notify members about published event (simplified: no member list in Phase 4)
      // In production, would fan out to all org members. For now, notification
      // creation is demonstrated via the RSVP and moderation flows.

      return c.json({ data: result.value });
    },
  );

  // Cancel event
  admin.post(
    "/events/:id/cancel",
    requireCapability("events.manage", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = eventService.cancelEvent(
        c.req.param("id") as ClubEventId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Event not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // Get RSVPs for an event
  admin.get(
    "/events/:id/rsvps",
    requireCapability("events.manage", "club-event", {
      extractResource: extractEventResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const rsvps = eventService.listEventRSVPs(
        c.req.param("id") as ClubEventId,
        session.organizationId as OrgId,
      );
      return c.json({ data: rsvps });
    },
  );

  app.route("/api/admin", admin);
}

export { eventService, EventService };
