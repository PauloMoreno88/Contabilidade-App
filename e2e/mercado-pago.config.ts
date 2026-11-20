import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./lib/env";

/**
 * Mercado Pago payments against staging (TEST credentials only). The tester pays by hand in a real
 * browser, so this suite is separate from `pnpm --filter e2e staging` and never runs with it.
 */
export default defineConfig({
  testDir: "./mercado-pago",
  globalSetup: "./lib/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
