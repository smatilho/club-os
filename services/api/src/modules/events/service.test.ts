import { describe, it, expect, beforeEach } from "vitest";
import { EventService } from "./service";
import type { OrgId, ClubEventId } from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;

describe("EventService", () => {
  let service: EventService;

  beforeEach(() => {
    service = new EventService();
  });

  const validInput = {
    organizationId: ORG1,
    createdByUserId: "admin-1",
    title: "Club Picnic",
    description: "Annual outdoor event",
    startsAt: "2026-06-01T10:00:00Z",
    endsAt: "2026-06-01T16:00:00Z",
    location: "Central Park",
    capacity: 50,
  };

  // --- Create ---

  describe("createEvent", () => {
    it("creates a draft event", () => {
      const result = service.createEvent(validInput);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("draft");
      expect(result.value.title).toBe("Club Picnic");
      expect(result.value.capacity).toBe(50);
      expect(result.value.publishedAt).toBeNull();
    });

    it("rejects empty title", () => {
      const result = service.createEvent({ ...validInput, title: "" });
      expect(result.ok).toBe(false);
    });

    it("rejects endsAt <= startsAt", () => {
      const result = service.createEvent({
        ...validInput,
        endsAt: "2026-06-01T09:00:00Z",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects non-integer capacity", () => {
      const result = service.createEvent({
        ...validInput,
        capacity: 2.5,
      });
      expect(result.ok).toBe(false);
    });

    it("accepts null capacity (unlimited)", () => {
      const result = service.createEvent({
        ...validInput,
        capacity: null,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.capacity).toBeNull();
    });
  });

  // --- Update ---

  describe("updateEvent", () => {
    it("updates a draft event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");

      const result = service.updateEvent(created.value.id, ORG1, {
        title: "Updated Picnic",
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe("Updated Picnic");
    });

    it("rejects update on canceled event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");
      service.cancelEvent(created.value.id, ORG1);

      const result = service.updateEvent(created.value.id, ORG1, {
        title: "Nope",
      });
      expect(result.ok).toBe(false);
    });
  });

  // --- Publish / Cancel ---

  describe("publishEvent", () => {
    it("publishes a draft event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");

      const result = service.publishEvent(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("published");
        expect(result.value.publishedAt).toBeTruthy();
      }
    });

    it("rejects publish of canceled event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");
      service.cancelEvent(created.value.id, ORG1);

      const result = service.publishEvent(created.value.id, ORG1);
      expect(result.ok).toBe(false);
    });
  });

  describe("cancelEvent", () => {
    it("cancels a published event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");
      service.publishEvent(created.value.id, ORG1);

      const result = service.cancelEvent(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("canceled");
        expect(result.value.canceledAt).toBeTruthy();
      }
    });
  });

  // --- RSVP ---

  describe("rsvp", () => {
    function createPublishedEvent(capacity: number | null = null) {
      const created = service.createEvent({
        ...validInput,
        capacity,
      });
      if (!created.ok) throw new Error("fail");
      service.publishEvent(created.value.id, ORG1);
      return created.value;
    }

    it("creates a going RSVP for published event", () => {
      const event = createPublishedEvent();
      const result = service.rsvp(event.id, "u1", ORG1);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("going");
    });

    it("rejects RSVP for draft event", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");

      const result = service.rsvp(created.value.id, "u1", ORG1);
      expect(result.ok).toBe(false);
    });

    it("rejects RSVP for canceled event", () => {
      const event = createPublishedEvent();
      service.cancelEvent(event.id, ORG1);

      const result = service.rsvp(event.id, "u1", ORG1);
      expect(result.ok).toBe(false);
    });

    it("places on waitlist when capacity is full", () => {
      const event = createPublishedEvent(2);

      service.rsvp(event.id, "u1", ORG1);
      service.rsvp(event.id, "u2", ORG1);

      const result = service.rsvp(event.id, "u3", ORG1);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("waitlist");
    });

    it("idempotent RSVP returns existing", () => {
      const event = createPublishedEvent();
      const r1 = service.rsvp(event.id, "u1", ORG1);
      const r2 = service.rsvp(event.id, "u1", ORG1);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (r1.ok && r2.ok) {
        expect(r1.value.id).toBe(r2.value.id);
      }
    });

    it("cancelRSVP cancels an existing RSVP", () => {
      const event = createPublishedEvent();
      service.rsvp(event.id, "u1", ORG1);

      const result = service.cancelRSVP(event.id, "u1", ORG1);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("canceled");
    });

    it("cancelRSVP returns error for missing RSVP", () => {
      const event = createPublishedEvent();
      const result = service.cancelRSVP(event.id, "u1", ORG1);
      expect(result.ok).toBe(false);
    });
  });

  // --- Tenant isolation ---

  describe("tenant isolation", () => {
    it("getEvent denies cross-org access", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");

      const result = service.getEvent(created.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("rsvp denies cross-org access", () => {
      const created = service.createEvent(validInput);
      if (!created.ok) throw new Error("fail");
      service.publishEvent(created.value.id, ORG1);

      const result = service.rsvp(created.value.id, "u1", ORG2);
      expect(result.ok).toBe(false);
    });

    it("listEvents filters by org", () => {
      service.createEvent(validInput);
      service.createEvent({
        ...validInput,
        organizationId: ORG2,
        title: "Other Org Event",
      });

      const org1Events = service.listEvents(ORG1, true);
      expect(org1Events).toHaveLength(1);
    });
  });
});
