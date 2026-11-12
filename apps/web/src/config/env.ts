/**
 * Build-time environment (NEXT_PUBLIC_* values are inlined by `next build`).
 * Checked in next.config.ts (see validateEnv) so a bad build fails early.
 */

export type AppEnv = "staging" | "production";

export const APP_ENV: AppEnv = process.env.NEXT_PUBLIC_APP_ENV === "staging" ? "staging" : "production";
export const IS_STAGING = APP_ENV === "staging";

/** Public origin of this site, used in robots.txt, the sitemap and metadataBase. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.exactracontabilidade.com.br").replace(/\/+$/, "");

export const stagingCopy = {
  banner: "Ambiente de testes: nenhum pagamento é real",
};
