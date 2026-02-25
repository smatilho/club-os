import type {
  ClubEvent,
  ClubEventId,
  EventRSVP,
  EventRSVPId,
  EventStatus,
  RSVPStatus,
  OrgId,
} from "@club-os/domain-core";
import {
  clubEventId,
  eventRSVPId,
  ok,
  err,
  type Result,
} from "@club-os/domain-core";

export class EventService {
  private events = new Map<string, ClubEvent>();
  private rsvps = new Map<string, EventRSVP>();

  reset(): void {
    this.events.clear();
    this.rsvps.clear();
  }

  // --- Events ---

  createEvent(input: {
    organizationId: OrgId;
    createdByUserId: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    location?: string | null;
    capacity?: number | null;
  }): Result<ClubEvent, string> {
    if (!input.title || input.title.trim() === "") {
      return err("title is required");
    }
    if (!input.description || input.description.trim() === "") {
      return err("description is required");
    }
    if (!input.startsAt) return err("startsAt is required");
    if (!input.endsAt) return err("endsAt is required");

    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      return err("endsAt must be after startsAt");
    }

    if (
      input.capacity !== undefined &&
      input.capacity !== null &&
      (input.capacity < 1 || !Number.isInteger(input.capacity))
    ) {
      return err("capacity must be a positive integer or null");
    }

    const now = new Date().toISOString();
    const event: ClubEvent = {
      id: clubEventId(crypto.randomUUID()),
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location ?? null,
      capacity: input.capacity ?? null,
      status: "draft",
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      canceledAt: null,
      version: 1,
    };

    this.events.set(event.id, event);
    return ok(event);
  }

  getEvent(
    id: ClubEventId,
    organizationId: OrgId,
  ): Result<ClubEvent, string> {
    const event = this.events.get(id);
    if (!event) return err("Event not found");
    if (event.organizationId !== organizationId)
      return err("Event not found");
    return ok(event);
  }

  getEventUnscoped(id: ClubEventId): ClubEvent | undefined {
    return this.events.get(id);
  }

  listEvents(
    organizationId: OrgId,
    includeAll: boolean = false,
  ): ClubEvent[] {
    return [...this.events.values()]
      .filter((e) => {
        if (e.organizationId !== organizationId) return false;
        if (!includeAll) return e.status === "published";
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }

  updateEvent(
    id: ClubEventId,
    organizationId: OrgId,
    input: {
      title?: string;
      description?: string;
      startsAt?: string;
      endsAt?: string;
      location?: string | null;
      capacity?: number | null;
    },
  ): Result<ClubEvent, string> {
    const event = this.events.get(id);
    if (!event) return err("Event not found");
    if (event.organizationId !== organizationId)
      return err("Event not found");
    if (event.status === "canceled")
      return err("Cannot update a canceled event");

    if (input.title !== undefined && input.title.trim() === "") {
      return err("title must not be empty");
    }

    const newStartsAt = input.startsAt ?? event.startsAt;
    const newEndsAt = input.endsAt ?? event.endsAt;
    if (new Date(newEndsAt) <= new Date(newStartsAt)) {
      return err("endsAt must be after startsAt");
    }

    if (
      input.capacity !== undefined &&
      input.capacity !== null &&
      (input.capacity < 1 || !Number.isInteger(input.capacity))
    ) {
      return err("capacity must be a positive integer or null");
    }

    const now = new Date().toISOString();
    const updated: ClubEvent = {
      ...event,
      title: input.title !== undefined ? input.title.trim() : event.title,
      description:
        input.description !== undefined
          ? input.description
          : event.description,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      location:
        input.location !== undefined ? input.location : event.location,
      capacity:
        input.capacity !== undefined ? input.capacity : event.capacity,
      updatedAt: now,
      version: event.version + 1,
    };

    this.events.set(updated.id, updated);
    return ok(updated);
  }

  publishEvent(
    id: ClubEventId,
    organizationId: OrgId,
  ): Result<ClubEvent, string> {
    const event = this.events.get(id);
    if (!event) return err("Event not found");
    if (event.organizationId !== organizationId)
      return err("Event not found");
    if (event.status === "canceled")
      return err("Cannot publish a canceled event");
    if (event.status === "published") return ok(event);

    const now = new Date().toISOString();
    const updated: ClubEvent = {
      ...event,
      status: "published",
      publishedAt: now,
      updatedAt: now,
      version: event.version + 1,
    };

    this.events.set(updated.id, updated);
    return ok(updated);
  }

  cancelEvent(
    id: ClubEventId,
    organizationId: OrgId,
  ): Result<ClubEvent, string> {
    const event = this.events.get(id);
    if (!event) return err("Event not found");
    if (event.organizationId !== organizationId)
      return err("Event not found");
    if (event.status === "canceled") return ok(event);

    const now = new Date().toISOString();
    const updated: ClubEvent = {
      ...event,
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
      version: event.version + 1,
    };

    this.events.set(updated.id, updated);
    return ok(updated);
  }

  // --- RSVPs ---

  /**
   * Create or update an RSVP. If capacity is set and full, the user is placed on waitlist.
   * Simplified Phase 4 behavior: single queue, no auto-promotion from waitlist.
   */
  rsvp(
    eventId: ClubEventId,
    userId: string,
    organizationId: OrgId,
  ): Result<EventRSVP, string> {
    const event = this.events.get(eventId);
    if (!event) return err("Event not found");
    if (event.organizationId !== organizationId)
      return err("Event not found");
    if (event.status !== "published")
      return err("Can only RSVP to published events");

    // Check for existing RSVP
    const existing = [...this.rsvps.values()].find(
      (r) =>
        r.eventId === eventId &&
        r.userId === userId &&
        r.organizationId === organizationId,
    );

    if (existing && existing.status === "going") {
      return ok(existing); // Already going
    }

    // Count active RSVPs
    const activeCount = [...this.rsvps.values()].filter(
      (r) =>
        r.eventId === eventId &&
        r.organizationId === organizationId &&
        r.status === "going",
    ).length;

    const isFull = event.capacity !== null && activeCount >= event.capacity;
    const status: RSVPStatus = isFull ? "waitlist" : "going";

    const now = new Date().toISOString();

    if (existing) {
      // Re-RSVP (e.g., from canceled or waitlist)
      const updated: EventRSVP = {
        ...existing,
        status,
        updatedAt: now,
        version: existing.version + 1,
      };
      this.rsvps.set(updated.id, updated);
      return ok(updated);
    }

    const rsvp: EventRSVP = {
      id: eventRSVPId(crypto.randomUUID()),
      organizationId,
      eventId,
      userId,
      status,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.rsvps.set(rsvp.id, rsvp);
    return ok(rsvp);
  }

  cancelRSVP(
    eventId: ClubEventId,
    userId: string,
    organizationId: OrgId,
  ): Result<EventRSVP, string> {
    const existing = [...this.rsvps.values()].find(
      (r) =>
        r.eventId === eventId &&
        r.userId === userId &&
        r.organizationId === organizationId,
    );

    if (!existing) return err("RSVP not found");
    if (existing.status === "canceled") return ok(existing);

    const now = new Date().toISOString();
    const updated: EventRSVP = {
      ...existing,
      status: "canceled",
      updatedAt: now,
      version: existing.version + 1,
    };
    this.rsvps.set(updated.id, updated);
    return ok(updated);
  }

  listMyRSVPs(userId: string, organizationId: OrgId): EventRSVP[] {
    return [...this.rsvps.values()].filter(
      (r) => r.userId === userId && r.organizationId === organizationId,
    );
  }

  listEventRSVPs(
    eventId: ClubEventId,
    organizationId: OrgId,
  ): EventRSVP[] {
    return [...this.rsvps.values()].filter(
      (r) =>
        r.eventId === eventId && r.organizationId === organizationId,
    );
  }
}
