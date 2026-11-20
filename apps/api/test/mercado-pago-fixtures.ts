import { createHmac } from 'node:crypto';
import type { Test } from 'supertest';
import { prisma } from '../src/db.js';

/** Same values as setup.ts. */
export const MP_WEBHOOK_SECRET = 'mp_test_webhook_secret';

type Payment = { id: number; status: string; status_detail?: string; external_reference: string; transaction_amount: number; payment_type_id: string };
/** Payments the stubbed Mercado Pago API returns, by id. */
export const mpPayments = new Map<string, Payment>();
let preference = 0;
let paymentId = 900000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Stubs fetch for api.mercadopago.com (preferences are created, payments come from mpPayments); other URLs pass through. */
export function stubMercadoPago() {
  const real = globalThis.fetch;
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname !== 'api.mercadopago.com') return real(input, init);
    const pref = url.pathname.match(/^\/checkout\/preferences(?:\/(.+))?$/);
    if (pref) {
      const id = pref[1] ?? `pref_test_${++preference}`;
      return json({ id, init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${id}` });
    }
    const payment = mpPayments.get(url.pathname.replace('/v1/payments/', ''));
    return payment ? json(payment) : json({ message: 'not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A notification signed like Mercado Pago does. */
export function mpWebhook(http: () => { post(url: string): Test }, id: string) {
  const requestId = `request-${id}`;
  const ts = String(Date.now());
  const v1 = createHmac('sha256', MP_WEBHOOK_SECRET).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
  return http()
    .post(`/webhooks/mercado-pago?data.id=${id}&type=payment`)
    .set('x-signature', `ts=${ts},v1=${v1}`)
    .set('x-request-id', requestId)
    .send({ type: 'payment', data: { id } });
}

/** Puts a payment of the contract's exact amount in the given state and delivers its notification (expects 200). */
export async function mpPay(http: () => { post(url: string): Test }, contractId: string, opts: { status?: string; type?: 'credit_card' | 'bank_transfer' | 'ticket' } = {}) {
  const contract = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });
  const id = ++paymentId;
  mpPayments.set(String(id), {
    id,
    status: opts.status ?? 'approved',
    external_reference: contractId,
    transaction_amount: contract.amountCents / 100,
    payment_type_id: opts.type ?? 'credit_card',
  });
  const res = await mpWebhook(http, String(id));
  expect(res.status).toBe(200);
  return res;
}
