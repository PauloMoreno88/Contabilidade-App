import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure code in src/lib (no browser, no Next.js).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
