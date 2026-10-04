/** Front-end origins from WEB_ORIGIN (comma-separated). The first one builds links (Stripe return URLs). */
export const webOrigins = (): string[] =>
  (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const webOrigin = (): string => webOrigins()[0];
