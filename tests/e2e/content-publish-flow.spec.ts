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
    "settings.read",
    "membership.read",
    "community.read",
    "reservation.read",
  ],
};

test.describe("content publish flow", () => {
  test("create, edit, publish, verify public, edit draft without re-publish", async ({
    page,
  }) => {
    await addMockSessionCookie(page, WEBMASTER_SESSION);

    // 1. Navigate to create page
    await page.goto("/admin/content/new");
    await expect(
      page.getByRole("heading", { name: "Create Page" }),
    ).toBeVisible();

    // 2. Fill create form with slug about/history
    await page.getByLabel("Title").fill("Club History");
    await page.getByLabel("Slug").clear();
    await page.getByLabel("Slug").fill("about/history");
    await page.getByLabel("Content").fill("Our club was founded in 1920.");
    await page.getByRole("button", { name: "Create Page" }).click();

    // 3. Should navigate to edit page — wait for the URL pattern and heading
    await page.waitForURL(/\/admin\/content\/[a-f0-9-]+/, {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "Edit Page" }),
    ).toBeVisible({ timeout: 10_000 });

    // 4. Edit draft content
    await page.getByLabel("Content").clear();
    await page
      .getByLabel("Content")
      .fill("Our club was founded in 1920. We have a rich history.");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

    // 5. Publish
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published successfully")).toBeVisible({
      timeout: 10_000,
    });

    // 6. Navigate to public page and verify published content
    await page.goto("/public/about/history");
    await expect(page.getByText("Club History")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(
        "Our club was founded in 1920. We have a rich history.",
      ),
    ).toBeVisible();

    // 7. Go back to edit, change draft without publishing
    await addMockSessionCookie(page, WEBMASTER_SESSION);
    await page.goto("/admin/content");
    await expect(page.getByText("Club History")).toBeVisible({
      timeout: 10_000,
    });

    // Click edit link
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Page" }),
    ).toBeVisible({ timeout: 10_000 });

    // Edit draft only (no publish)
    await page.getByLabel("Content").clear();
    await page
      .getByLabel("Content")
      .fill("This is a secret draft edit not yet published.");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

    // 8. Verify public page still shows old published content
    await page.goto("/public/about/history");
    await expect(
      page.getByText(
        "Our club was founded in 1920. We have a rich history.",
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("public page returns 404 for unpublished content", async ({
    page,
  }) => {
    await page.goto("/public/nonexistent-page");
    await expect(page.getByText("Page Not Found")).toBeVisible({
      timeout: 10_000,
    });
  });
});
