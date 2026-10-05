import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // @exactra/shared ships TypeScript source.
  transpilePackages: ["@exactra/shared"],
};

/**
 * NEXT_PUBLIC_* values are baked into the static files at build time, so a
 * wrong one ships to every visitor. Fail the build instead.
 */
function validateEnv() {
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? "production";
  if (env !== "production" && env !== "staging") {
    throw new Error(`NEXT_PUBLIC_APP_ENV must be "staging" or "production" (got "${env}").`);
  }
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    if (env === "production") throw new Error("NEXT_PUBLIC_USE_MOCK=true is not allowed in a production build.");
    return;
  }
  const api = process.env.NEXT_PUBLIC_API_URL;
  const local = api ? /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(api) : false;
  if (env === "production" && (!api || local)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be the public API URL in a production build (got "${api ?? ""}"). ` +
        "For a local build set NEXT_PUBLIC_APP_ENV=staging or NEXT_PUBLIC_USE_MOCK=true.",
    );
  }
  if (!api) console.warn("⚠ NEXT_PUBLIC_API_URL is not set: API calls will go to the site origin.");
}

export default function config(phase: string): NextConfig {
  // `next lint` also loads this file in the build phase; only a real build needs the check.
  const linting = process.argv.includes("lint");
  if (phase === PHASE_PRODUCTION_BUILD && !linting) validateEnv();
  return nextConfig;
}
