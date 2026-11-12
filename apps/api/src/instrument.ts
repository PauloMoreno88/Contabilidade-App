import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';

/** E-mails and runs of 11 to 14 digits (CPF, CNPJ, phone), with or without punctuation. */
const PII = /[\w.+-]+@[\w-]+(\.[\w-]+)+|\d[\d.\-/ ]{9,17}\d/g;
const redact = (text?: string) => text?.replace(PII, (m) => (m.includes('@') || m.replace(/\D/g, '').length >= 11 ? '[redacted]' : m));

/**
 * Error tracking (docs/specs/lancamento-producao.md, REQ-004). Off without SENTRY_DSN.
 * No personal data: request body, cookies, headers, query string, user, extra data and
 * contexts are dropped; e-mails and CPF/CNPJ/phone numbers in error messages are redacted.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) event.request = { method: event.request.method, url: event.request.url?.split('?')[0] };
  delete event.user;
  delete event.extra;
  if (event.contexts) event.contexts = { runtime: event.contexts.runtime, os: event.contexts.os };
  event.message = redact(event.message);
  for (const ex of event.exception?.values ?? []) ex.value = redact(ex.value);
  return event;
}

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
    maxBreadcrumbs: 0,
    beforeSend: scrubEvent,
  });
}
