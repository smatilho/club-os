import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3100";

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

test.describe("web route guards", () => {
  test("root redirects to /public", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/public$/);
    await expect(
      page.getByRole("heading", { name: "Welcome to Club OS" }),
    ).toBeVisible();
  });

  test("unauthenticated user is redirected from /member to /public", async ({ page }) => {
    await page.goto("/member");
    await expect(page).toHaveURL(/\/public$/);
  });

  test("unauthenticated user is redirected from /admin to /public", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/public$/);
  });

  test("member session can access /member", async ({ page }) => {
    await addMockSessionCookie(page, {
      userId: "u-member",
      organizationId: "org-1",
      roles: ["member"],
      capabilities: ["membership.read"],
    });

    await page.goto("/member");
    await expect(page).toHaveURL(/\/member$/);
    await expect(
      page.getByRole("heading", { name: "Member Dashboard" }),
    ).toBeVisible();
  });

  test("member session without management capability is redirected from /admin to /member", async ({
    page,
  }) => {
    await addMockSessionCookie(page, {
      userId: "u-member",
      organizationId: "org-1",
      roles: ["member"],
      capabilities: ["membership.read"],
    });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/member$/);
  });

  test("management capability allows /admin access", async ({ page }) => {
    await addMockSessionCookie(page, {
      userId: "u-admin",
      organizationId: "org-1",
      roles: ["webmaster"],
      capabilities: ["content.publish"],
    });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeVisible();
  });
});
