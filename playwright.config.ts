import { defineConfig } from "@playwright/test";

const webPort = 3100;
const apiPort = 4100;
const baseURL = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
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
