// Error tracking in the browser (docs/specs/lancamento-producao.md, REQ-004).
// Off without NEXT_PUBLIC_SENTRY_DSN; loaded lazily so the landing does not pay for it.
// No personal data: query strings (checkout and magic-link tokens) and breadcrumbs are dropped.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/browser").then((Sentry) =>
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? "production",
      maxBreadcrumbs: 0,
      beforeSend(event) {
        if (event.request) event.request = { url: event.request.url?.split(/[?#]/)[0] };
        delete event.user;
        return event;
      },
    }),
  );
}
