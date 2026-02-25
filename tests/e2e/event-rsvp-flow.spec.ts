import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3100";
const API_URL = "http://127.0.0.1:4100";

type MockSession = {
  userId: string;
  organizationId: string;
  roles: string[];
  capabilities: string[];
};

async function addMockSessionCookie(page: Page, session: MockSession) {
  await page.context().addCookies([
    {
      name: "mock-session",
      value: encodeURIComponent(JSON.stringify(session)),
      url: BASE_URL,
    },
  ]);
}

const MEMBER_SESSION: MockSession = {
  userId: "e2e-member",
  organizationId: "org-default",
  roles: ["member"],
  capabilities: [
    "membership.read",
    "community.read",
    "community.write",
    "community.comment",
    "community.report",
    "reservation.read",
    "events.read",
    "notifications.read",
  ],
};

const ADMIN_SESSION: MockSession = {
  userId: "e2e-admin",
  organizationId: "org-default",
  roles: ["org_admin"],
  capabilities: [
    "membership.read",
    "membership.manage",
    "community.read",
    "community.write",
    "community.comment",
    "community.report",
    "community.moderate",
    "reservation.read",
    "reservation.manage",
    "reservation.override",
    "content.read",
    "content.write",
    "content.publish",
    "settings.read",
    "settings.manage",
    "finance.read",
    "finance.manage",
    "finance.refund",
    "events.read",
    "events.write",
    "events.publish",
    "events.manage",
    "notifications.read",
    "audit.read",
  ],
};

const memberHeaders = {
  "x-mock-user-id": "e2e-member",
  "x-mock-org-id": "org-default",
  "x-mock-roles": "member",
  "content-type": "application/json",
};

const adminHeaders = {
  "x-mock-user-id": "e2e-admin",
  "x-mock-org-id": "org-default",
  "x-mock-roles": "org_admin",
  "content-type": "application/json",
};

test.describe("event RSVP flow", () => {
  test("admin creates event, publishes, member RSVPs, admin cancels", async ({
    request,
  }) => {
    const startsAt = new Date(Date.now() + 86400000 * 30).toISOString();
    const endsAt = new Date(
      Date.now() + 86400000 * 30 + 4 * 3600000,
    ).toISOString();

    // 1. Admin creates a draft event
    const createRes = await request.post(
      `${API_URL}/api/admin/events`,
      {
        headers: adminHeaders,
        data: {
          title: "E2E Summer Gala",
          description: "Annual summer event",
          startsAt,
          endsAt,
          location: "Grand Hall",
          capacity: 100,
        },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { data: event } = await createRes.json();
    const eventId = event.id;
    expect(eventId).toBeTruthy();
    expect(event.status).toBe("draft");

    // 2. Admin publishes the event
    const publishRes = await request.post(
      `${API_URL}/api/admin/events/${eventId}/publish`,
      { headers: adminHeaders },
    );
    expect(publishRes.ok()).toBe(true);
    const { data: published } = await publishRes.json();
    expect(published.status).toBe("published");

    // 3. Member sees the event in the list
    const listRes = await request.get(`${API_URL}/api/events`, {
      headers: memberHeaders,
    });
    expect(listRes.ok()).toBe(true);
    const { data: events } = await listRes.json();
    expect(events.some((e: { id: string }) => e.id === eventId)).toBe(true);

    // 4. Member RSVPs
    const rsvpRes = await request.post(
      `${API_URL}/api/events/${eventId}/rsvp`,
      { headers: memberHeaders },
    );
    expect(rsvpRes.ok()).toBe(true);
    const { data: rsvp } = await rsvpRes.json();
    expect(rsvp.status).toBe("going");

    // 5. Member sees event in their RSVPs
    const myRsvpsRes = await request.get(
      `${API_URL}/api/events/my/rsvps`,
      { headers: memberHeaders },
    );
    expect(myRsvpsRes.ok()).toBe(true);
    const { data: myRsvps } = await myRsvpsRes.json();
    expect(
      myRsvps.some((r: { eventId: string }) => r.eventId === eventId),
    ).toBe(true);

    // 6. Member cancels their RSVP
    const cancelRsvpRes = await request.post(
      `${API_URL}/api/events/${eventId}/rsvp/cancel`,
      { headers: memberHeaders },
    );
    expect(cancelRsvpRes.ok()).toBe(true);

    // 7. Admin cancels the event
    const cancelEventRes = await request.post(
      `${API_URL}/api/admin/events/${eventId}/cancel`,
      { headers: adminHeaders },
    );
    expect(cancelEventRes.ok()).toBe(true);
    const { data: canceledEvent } = await cancelEventRes.json();
    expect(canceledEvent.status).toBe("canceled");

    // 8. Member sees the event as canceled
    const finalRes = await request.get(
      `${API_URL}/api/events/${eventId}`,
      { headers: memberHeaders },
    );
    expect(finalRes.ok()).toBe(true);
    const { data: finalEvent } = await finalRes.json();
    expect(finalEvent.status).toBe("canceled");
  });

  test("member can view events page", async ({ page }) => {
    await addMockSessionCookie(page, MEMBER_SESSION);
    await page.goto("/member/events");

    await expect(
      page.getByRole("heading", { name: "Upcoming Events" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin can view events management page", async ({ page }) => {
    await addMockSessionCookie(page, ADMIN_SESSION);
    await page.goto("/admin/events");

    await expect(
      page.getByRole("heading", { name: "Events" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: "New Event" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
