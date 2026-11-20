import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./email-history",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3102", screenshot: "only-on-failure" },
  webServer: {
    command: "pnpm --filter web dev --port 3102",
    cwd: "..",
    url: "http://localhost:3102",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_APP_ENV: "staging", NEXT_PUBLIC_USE_MOCK: "false", NEXT_PUBLIC_API_URL: "http://localhost:3102" },
  },
});
