#!/usr/bin/env node

const apiBaseUrl = process.env.CLUB_OS_API_BASE_URL ?? "http://127.0.0.1:4100";
const organizationId = process.env.CLUB_OS_DEMO_ORG_ID ?? "org-demo";
const userId = process.env.CLUB_OS_DEMO_USER_ID ?? "demo-admin";

const authHeaders = {
  "x-mock-user-id": userId,
  "x-mock-org-id": organizationId,
  "x-mock-roles": "org_admin,webmaster",
  "content-type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = { error: "Invalid JSON response" };
  }

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} failed (${response.status}): ${body.error ?? "Unknown error"}`,
    );
  }

  return body;
}

async function seedContent() {
  const result = await request("/api/content/seed", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return result.data;
}

async function seedBranding() {
  const payload = {
    brandName: "Club OS Demo Tenant",
    logoUrl: null,
    primaryColor: "#17507f",
    accentColor: "#f97316",
    surfaceColor: "#f5f5f5",
    textColor: "#111827",
  };

  const result = await request("/api/org-profile/theme", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return result.data;
}

async function main() {
  const [seedResult, themeResult] = await Promise.all([
    seedContent(),
    seedBranding(),
  ]);

  console.log("Demo tenant seed complete:");
  console.log(
    JSON.stringify(
      {
        apiBaseUrl,
        organizationId,
        seed: seedResult,
        theme: {
          brandName: themeResult.brandName,
          primaryColor: themeResult.primaryColor,
          accentColor: themeResult.accentColor,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Demo tenant seed failed:", error.message);
  process.exit(1);
});
