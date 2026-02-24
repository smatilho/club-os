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
  capabilities: ["membership.read", "community.read", "reservation.read"],
};

const ADMIN_SESSION: MockSession = {
  userId: "e2e-admin",
  organizationId: "org-default",
  roles: ["org_admin"],
  capabilities: [
    "membership.read",
    "community.read",
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
  ],
};

test.describe("reservation booking flow", () => {

  test("member can check availability", async ({ page }) => {
    await addMockSessionCookie(page, MEMBER_SESSION);
    await page.goto("/member/reservations");

    await expect(
      page.getByRole("heading", { name: "My Reservations" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("member booking page renders date selection", async ({ page }) => {
    await addMockSessionCookie(page, MEMBER_SESSION);
    await page.goto("/member/reservations/new");

    await expect(
      page.getByRole("heading", { name: "Book a Reservation" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1. Choose Dates")).toBeVisible();
  });

  test("admin can view reservations list", async ({ page }) => {
    await addMockSessionCookie(page, ADMIN_SESSION);
    await page.goto("/admin/reservations");

    await expect(
      page.getByRole("heading", { name: "Reservations" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin can view payments list", async ({ page }) => {
    await addMockSessionCookie(page, ADMIN_SESSION);
    await page.goto("/admin/payments");

    await expect(
      page.getByRole("heading", { name: "Payments" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("full member booking flow via API", async ({ request }) => {
    const headers = {
      "x-mock-user-id": "e2e-booking-user",
      "x-mock-org-id": "org-default",
      "x-mock-roles": "member",
      "content-type": "application/json",
    };

    // 1. Check availability
    const startsAt = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days from now
    const endsAt = new Date(Date.now() + 86400000 * 32).toISOString(); // 32 days from now

    const availRes = await request.get(
      `${API_URL}/api/reservations/availability?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`,
      { headers },
    );
    expect(availRes.ok()).toBe(true);
    const { data: availability } = await availRes.json();
    expect(availability.length).toBeGreaterThan(0);

    // Find an available unit
    const availableUnit = availability.find(
      (a: { available: boolean }) => a.available,
    );
    expect(availableUnit).toBeTruthy();

    // 2. Create a hold
    const holdRes = await request.post(
      `${API_URL}/api/reservations/holds`,
      {
        headers,
        data: {
          resourceUnitId: availableUnit.resourceUnitId,
          startsAt,
          endsAt,
        },
      },
    );
    expect(holdRes.ok()).toBe(true);
    const { data: hold } = await holdRes.json();
    expect(hold.status).toBe("held");

    // 3. Create reservation (triggers payment)
    const bookRes = await request.post(`${API_URL}/api/reservations`, {
      headers,
      data: {
        holdId: hold.id,
        idempotencyKey: `e2e_booking_${Date.now()}`,
      },
    });
    expect(bookRes.ok()).toBe(true);
    const { data: reservation } = await bookRes.json();
    expect(["confirmed", "payment_pending", "payment_failed"]).toContain(
      reservation.status,
    );

    // 4. Get reservation detail
    const detailRes = await request.get(
      `${API_URL}/api/reservations/${reservation.id}`,
      { headers },
    );
    expect(detailRes.ok()).toBe(true);
    const { data: detail } = await detailRes.json();
    expect(detail.id).toBe(reservation.id);

    // 5. Cancel the reservation (requires admin for confirmed reservations)
    const adminHeaders = {
      "x-mock-user-id": "e2e-admin",
      "x-mock-org-id": "org-default",
      "x-mock-roles": "org_admin",
      "content-type": "application/json",
    };
    const cancelRes = await request.post(
      `${API_URL}/api/reservations/${reservation.id}/cancel`,
      {
        headers: adminHeaders,
        data: { reason: "E2E test cleanup" },
      },
    );
    expect(cancelRes.ok()).toBe(true);
    const { data: canceled } = await cancelRes.json();
    expect(canceled.status).toBe("canceled");
  });

  test("admin override confirm flow via API", async ({ request }) => {
    const memberHeaders = {
      "x-mock-user-id": "e2e-override-user",
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

    // Create admin override reservation (use different dates to avoid overlap)
    const startsAt = new Date(Date.now() + 86400000 * 90).toISOString();
    const endsAt = new Date(Date.now() + 86400000 * 92).toISOString();

    // Check availability first
    const availRes = await request.get(
      `${API_URL}/api/reservations/availability?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`,
      { headers: memberHeaders },
    );
    const { data: availability } = await availRes.json();
    const unit = availability.find(
      (a: { available: boolean }) => a.available,
    );
    expect(unit).toBeTruthy();

    // Admin creates override reservation
    const createRes = await request.post(
      `${API_URL}/api/admin/reservations/override-create`,
      {
        headers: adminHeaders,
        data: {
          userId: "e2e-override-user",
          resourceUnitId: unit.resourceUnitId,
          startsAt,
          endsAt,
          reason: "E2E test override booking",
          idempotencyKey: `e2e_override_${Date.now()}`,
        },
      },
    );
    const createBody = await createRes.json();
    expect(createRes.ok(), `Override create failed: ${JSON.stringify(createBody)}`).toBe(true);
    expect(createBody.data.status).toBe("confirmed");
    expect(createBody.data.source).toBe("admin_override");
  });
});
