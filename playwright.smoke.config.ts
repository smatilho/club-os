import { defineConfig } from "@playwright/test";

const webPort = 3100;
const apiPort = 4100;
const baseURL = `http://127.0.0.1:${webPort}`;

const smokeProjects = [
  { name: "chromium", browserName: "chromium" as const },
  { name: "firefox", browserName: "firefox" as const },
  { name: "webkit", browserName: "webkit" as const },
];

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["smoke-core-routes.spec.ts"],
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      scale: "css",
    },
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: smokeProjects,
  webServer: [
    {
      command: `cd services/api && PORT=${apiPort} corepack pnpm exec tsx src/server.ts`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `cd apps/web && CLUB_OS_API_BASE_URL=http://127.0.0.1:${apiPort} corepack pnpm exec next dev --hostname 127.0.0.1 --port ${webPort}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
