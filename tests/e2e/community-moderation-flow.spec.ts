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

test.describe("community moderation flow", () => {
  test("member creates post, admin moderates it via API", async ({
    request,
  }) => {
    // 1. Member creates a post
    const createRes = await request.post(
      `${API_URL}/api/community/posts`,
      {
        headers: memberHeaders,
        data: {
          title: "E2E Test Post",
          body: "This is a test post for moderation",
          tags: ["e2e-test"],
        },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { data: post } = await createRes.json();
    const postId = post.id;
    expect(postId).toBeTruthy();

    // 2. Verify post is readable
    const getRes = await request.get(
      `${API_URL}/api/community/posts/${postId}`,
      { headers: memberHeaders },
    );
    expect(getRes.ok()).toBe(true);
    const { data: fetched } = await getRes.json();
    expect(fetched.title).toBe("E2E Test Post");

    // 3. Member adds a comment
    const commentRes = await request.post(
      `${API_URL}/api/community/posts/${postId}/comments`,
      {
        headers: memberHeaders,
        data: { body: "E2E comment" },
      },
    );
    expect(commentRes.ok()).toBe(true);
    const { data: comment } = await commentRes.json();
    const commentId = comment.id;
    expect(commentId).toBeTruthy();

    // 4. Member reports the post
    const reportRes = await request.post(
      `${API_URL}/api/community/posts/${postId}/report`,
      {
        headers: memberHeaders,
        data: { reasonCode: "spam", details: "E2E test report" },
      },
    );
    expect(reportRes.status()).toBeGreaterThanOrEqual(200);
    expect(reportRes.status()).toBeLessThan(300);
    const { data: report } = await reportRes.json();
    const reportId = report.id;
    expect(reportId).toBeTruthy();

    // 5. Admin sees the report in the list
    const reportsRes = await request.get(
      `${API_URL}/api/admin/community/reports`,
      { headers: adminHeaders },
    );
    expect(reportsRes.ok()).toBe(true);
    const { data: reports } = await reportsRes.json();
    expect(reports.some((r: { id: string }) => r.id === reportId)).toBe(true);

    // 6. Admin triages the report
    const triageRes = await request.post(
      `${API_URL}/api/admin/community/reports/${reportId}/triage`,
      { headers: adminHeaders },
    );
    expect(triageRes.ok()).toBe(true);

    // 7. Admin hides the post
    const hideRes = await request.post(
      `${API_URL}/api/admin/community/posts/${postId}/hide`,
      { headers: adminHeaders },
    );
    expect(hideRes.ok()).toBe(true);

    // 8. Admin resolves the report
    const resolveRes = await request.post(
      `${API_URL}/api/admin/community/reports/${reportId}/resolve`,
      {
        headers: adminHeaders,
        data: { resolutionNotes: "Hidden due to spam" },
      },
    );
    expect(resolveRes.ok()).toBe(true);

    // 9. Verify hidden post is no longer readable by members
    const hiddenRes = await request.get(
      `${API_URL}/api/community/posts/${postId}`,
      { headers: memberHeaders },
    );
    expect(hiddenRes.status()).toBe(404);
  });

  test("member can view community page", async ({ page }) => {
    await addMockSessionCookie(page, MEMBER_SESSION);
    await page.goto("/member/community");

    await expect(
      page.getByRole("heading", { name: "Community" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin can view reports page", async ({ page }) => {
    await addMockSessionCookie(page, ADMIN_SESSION);
    await page.goto("/admin/community/reports");

    await expect(
      page.getByRole("heading", { name: "Community Reports" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
