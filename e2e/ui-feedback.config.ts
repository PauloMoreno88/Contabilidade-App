import { defineConfig } from "@playwright/test";

// Local mocks: no staging credentials, external services or real mutations.
export default defineConfig({
  testDir: "./ui-feedback",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3101", screenshot: "only-on-failure" },
  webServer: {
    command: "pnpm --filter web dev --port 3101",
    cwd: "..",
    url: "http://localhost:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_APP_ENV: "staging", NEXT_PUBLIC_USE_MOCK: "true", NEXT_PUBLIC_CHECKOUT_ENABLED: "true" },
  },
});
