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

const WEBMASTER_SESSION: MockSession = {
  userId: "e2e-webmaster",
  organizationId: "org-default",
  roles: ["webmaster"],
  capabilities: [
    "content.read",
    "content.write",
    "content.publish",
    "navigation.read",
    "navigation.write",
    "settings.read",
    "membership.read",
    "community.read",
    "reservation.read",
  ],
};

test.describe("seeded site", () => {
  test("public homepage resolves to seeded CMS home page", async ({ page }) => {
    await page.goto("/public");

    // Should render seeded homepage content (block-based), not the onboarding fallback
    await expect(page.getByText("Welcome to Our Club")).toBeVisible({
      timeout: 10_000,
    });
    // Should NOT show onboarding fallback
    await expect(page.locator("[data-testid='onboarding-fallback']")).not.toBeVisible();
  });

  test("seeded nav items appear in public header", async ({ page }) => {
    await page.goto("/public");

    // Seeded menu items should be in the header nav
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact" })).toBeVisible();
  });

  test("seeded About page is reachable via nav", async ({ page }) => {
    await page.goto("/public");

    // Click "About" in nav
    await page.getByRole("link", { name: "About" }).click();
    await page.waitForURL("**/public/about", { timeout: 10_000 });

    // Should render seeded About page content
    await expect(page.getByText("Our Story")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("seeded Contact page is reachable via nav", async ({ page }) => {
    await page.goto("/public");

    await page.getByRole("link", { name: "Contact" }).click();
    await page.waitForURL("**/public/contact", { timeout: 10_000 });

    await expect(page.getByText("Contact Us")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("webmaster workflow", () => {
  test("create page from template, publish, add to menu, verify in nav", async ({
    page,
  }) => {
    await addMockSessionCookie(page, WEBMASTER_SESSION);

    // 1. Navigate to create page
    await page.goto("/admin/content/new");
    await expect(
      page.getByRole("heading", { name: "Create Page" }),
    ).toBeVisible({ timeout: 10_000 });

    // 2. Choose "Block-based" mode
    await page.getByRole("button", { name: /Block-based/i }).click();

    // 3. Pick "Facilities" template
    await page.getByRole("button", { name: /Facilities/i }).click();

    // 4. Fill in title and slug
    await page.getByLabel("Title").fill("Our Facilities");
    await page.getByLabel("Slug").clear();
    await page.getByLabel("Slug").fill("facilities");

    // 5. Enable menu placement
    await page.getByLabel(/Show in.*menu/i).check();
    await page.getByLabel("Location").selectOption("public_header");

    // 6. Create page
    await page.getByRole("button", { name: "Create Page" }).click();

    // 7. Should navigate to editor
    await page.waitForURL(/\/admin\/content\/[a-f0-9-]+/, {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "Edit Page" }),
    ).toBeVisible({ timeout: 10_000 });

    // 8. Publish the page
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText(/Published successfully/)).toBeVisible({
      timeout: 10_000,
    });

    // 9. Verify the page is reachable at /public/facilities
    await page.goto("/public/facilities");
    await expect(page.getByText("Our Facilities")).toBeVisible({
      timeout: 10_000,
    });

    // 10. Verify the page appears in the public header nav
    await expect(page.getByRole("link", { name: "Our Facilities" })).toBeVisible();
  });
});
