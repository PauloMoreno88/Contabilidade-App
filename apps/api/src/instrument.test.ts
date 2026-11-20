import type { ErrorEvent } from '@sentry/nestjs';
import { scrubEvent } from './instrument.js';

describe('scrubEvent', () => {
  it('keeps method and path, drops body, cookies, headers, query and user', () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        method: 'POST',
        url: 'https://api.exactracontabilidade.com.br/contracts/c1/status?token=secret',
        data: { email: 'a@ex.com', taxId: '12345678000190' },
        cookies: { session: 'x' },
        headers: { authorization: 'Bearer x' },
        query_string: 'token=secret',
      },
      user: { email: 'a@ex.com' },
    } as ErrorEvent);
    expect(event.request).toEqual({ method: 'POST', url: 'https://api.exactracontabilidade.com.br/contracts/c1/status' });
    expect(event.user).toBeUndefined();
  });

  it('redacts e-mails and CPF/CNPJ in error messages, keeps ids and dates', () => {
    const event = scrubEvent({
      type: undefined,
      exception: { values: [{ type: 'Error', value: 'Resend rejected a@ex.com for 12.345.678/0001-90 (CPF 123.456.789-09), contract cmwe2x1gd on 2026-11-12' }] },
      extra: { body: 'x' },
      contexts: { runtime: { name: 'node' }, trace: { trace_id: 'x' }, custom: { email: 'a@ex.com' } },
    } as unknown as ErrorEvent);
    expect(event.exception?.values?.[0].value).toBe('Resend rejected [redacted] for [redacted] (CPF [redacted]), contract cmwe2x1gd on 2026-11-12');
    expect(event.extra).toBeUndefined();
    expect(event.contexts).toEqual({ runtime: { name: 'node' }, os: undefined });
  });
});
