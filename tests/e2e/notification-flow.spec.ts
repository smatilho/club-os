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

const adminHeaders = {
  "x-mock-user-id": "e2e-admin",
  "x-mock-org-id": "org-default",
  "x-mock-roles": "org_admin",
  "content-type": "application/json",
};

const memberHeaders = {
  "x-mock-user-id": "e2e-member",
  "x-mock-org-id": "org-default",
  "x-mock-roles": "member",
  "content-type": "application/json",
};

test.describe("notification flow", () => {
  test("notifications created during event RSVP are visible", async ({
    request,
  }) => {
    const startsAt = new Date(Date.now() + 86400000 * 30).toISOString();
    const endsAt = new Date(
      Date.now() + 86400000 * 30 + 4 * 3600000,
    ).toISOString();

    // 1. Admin creates and publishes an event
    const createRes = await request.post(
      `${API_URL}/api/admin/events`,
      {
        headers: adminHeaders,
        data: {
          title: "E2E Notification Event",
          description: "Event to trigger notifications",
          startsAt,
          endsAt,
          location: "Main Room",
          capacity: 50,
        },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { data: event } = await createRes.json();
    const eventId = event.id;
    expect(eventId).toBeTruthy();

    const publishRes = await request.post(
      `${API_URL}/api/admin/events/${eventId}/publish`,
      { headers: adminHeaders },
    );
    expect(publishRes.ok()).toBe(true);

    // 2. Member RSVPs (should generate a notification for the event creator)
    const rsvpRes = await request.post(
      `${API_URL}/api/events/${eventId}/rsvp`,
      { headers: memberHeaders },
    );
    expect(rsvpRes.ok()).toBe(true);

    // 3. Admin checks their notifications
    const notifRes = await request.get(
      `${API_URL}/api/notifications/my`,
      { headers: adminHeaders },
    );
    expect(notifRes.ok()).toBe(true);
    const { data: notifications } = await notifRes.json();
    expect(notifications.length).toBeGreaterThan(0);

    // 4. Mark the first notification as read
    const notifId = notifications[0].id;
    const readRes = await request.post(
      `${API_URL}/api/notifications/${notifId}/read`,
      { headers: adminHeaders },
    );
    expect(readRes.ok()).toBe(true);
    const { data: readNotif } = await readRes.json();
    expect(readNotif.readAt).toBeTruthy();
  });

  test("member can view notifications page", async ({ page }) => {
    await addMockSessionCookie(page, MEMBER_SESSION);
    await page.goto("/member/notifications");

    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
