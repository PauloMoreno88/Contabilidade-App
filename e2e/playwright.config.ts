import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./lib/env";

/**
 * Full-flow tests against the published staging site (docs/fluxos.html).
 * Serial on purpose: the flows share one customer and one admin account.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./lib/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "fluxos", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: /auth\.setup\.ts/ },
  ],
});
