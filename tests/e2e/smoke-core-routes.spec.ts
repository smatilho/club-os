import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3100";

type MockSession = {
  userId: string;
  organizationId: string;
  roles: string[];
  capabilities: string[];
};

const MEMBER_SESSION: MockSession = {
  userId: "smoke-member",
  organizationId: "org-default",
  roles: ["member"],
  capabilities: [
    "reservation.read",
    "community.read",
    "events.read",
    "notifications.read",
    "navigation.read",
  ],
};

const ADMIN_SESSION: MockSession = {
  userId: "smoke-admin",
  organizationId: "org-default",
  roles: ["org_admin"],
  capabilities: [
    "membership.manage",
    "reservation.manage",
    "reservation.override",
    "finance.manage",
    "finance.refund",
    "community.moderate",
    "events.manage",
    "events.write",
    "events.publish",
    "settings.read",
    "settings.manage",
    "content.write",
    "content.publish",
    "navigation.read",
    "navigation.write",
    "audit.read",
  ],
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

test("public route area visual baseline", async ({ page }) => {
  await page.goto("/public");

  await expect(page.getByRole("link", { name: "Club OS" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome to Our Club" })).toBeVisible();

  // Public landing visuals pick up minor cross-platform font/rendering variance in CI.
  await expect(page).toHaveScreenshot("core-public-route.png", {
    maxDiffPixelRatio: 0.025,
  });
});

test("member route area visual baseline", async ({ page }) => {
  await addMockSessionCookie(page, MEMBER_SESSION);
  await page.goto("/member");

  await expect(page.getByRole("heading", { name: "Member Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Member Portal" })).toBeVisible();

  await expect(page).toHaveScreenshot("core-member-route.png");
});

test("admin route area visual baseline", async ({ page }) => {
  await addMockSessionCookie(page, ADMIN_SESSION);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();

  await expect(page).toHaveScreenshot("core-admin-route.png");
});
