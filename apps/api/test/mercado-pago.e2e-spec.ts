import { createHmac } from 'node:crypto';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { totalPriceCents } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { MercadoPagoProvider } from '../src/payments/mercado-pago.provider.js';
import { createApp } from './app.js';

const customer = { name: 'João Souza', email: 'mp@ex.com', phone: '11988887777', document: '123.456.789-09' };
const secret = 'mp_test_webhook_secret';

describe('Mercado Pago checkout and webhook (e2e)', () => {
  let app: NestExpressApplication;
  let fetchMock: ReturnType<typeof vi.fn>;
  let preferenceNumber = 0;
  let payment: { id: number; status: string; external_reference: string; transaction_amount: number; payment_type_id: string };

  beforeAll(async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR_test';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_MODE = 'test';
    fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/checkout/preferences')
      ? { id: `pref_test_${++preferenceNumber}`, init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_test_${preferenceNumber}` }
      : payment), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    delete process.env.MERCADO_PAGO_MODE;
  });

  const http = () => request(app.getHttpServer());
  const checkout = () => http().post('/checkout/sessions').send({ plan: 'exactra', period: 'ANNUAL', method: 'CARD', provider: 'MERCADO_PAGO', customer, consent: true });
  const webhook = (id: string, valid = true) => {
    const ts = String(Date.now());
    const requestId = 'request-1';
    const hash = createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
    return http().post(`/webhooks/mercado-pago?data.id=${id}&type=payment`)
      .set('x-signature', `ts=${ts},v1=${valid ? hash : '0'.repeat(64)}`)
      .set('x-request-id', requestId)
      .send({ type: 'payment', data: { id } });
  };

  it('requires an explicit test or live mode before enabling checkout', () => {
    delete process.env.MERCADO_PAGO_MODE;
    expect(new MercadoPagoProvider().configured).toBe(false);
    process.env.MERCADO_PAGO_MODE = 'test';
  });

  it('creates a 12-installment preference and only activates after a verified approved payment', async () => {
    const { body } = await checkout().expect(201);
    expect(body.checkoutUrl).toContain('mercadopago.com.br');
    const requestBody = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
    expect(requestBody.external_reference).toBe(body.contractId);
    expect(requestBody.items[0].unit_price).toBe(totalPriceCents('exactra') / 100);
    expect(requestBody.payment_methods.installments).toBe(12);
    expect(requestBody.back_urls.pending).toContain(`/checkout/status?contract=${body.contractId}`);
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: body.contractId } })).mercadoPagoPreferenceId).toBe('pref_test_1');

    payment = { id: 123456, status: 'pending', external_reference: body.contractId, transaction_amount: totalPriceCents('exactra') / 100, payment_type_id: 'credit_card' };
    await webhook('123456').expect(200);
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: body.contractId } })).status).toBe('PENDING_PAYMENT');
    await webhook('123456', false).expect(400);

    payment.status = 'approved';
    await webhook('123456').expect(200);
    const duplicate = await webhook('123456').expect(200);
    expect(duplicate.body.duplicate).toBe(true);
    const contract = await prisma.contract.findUniqueOrThrow({ where: { id: body.contractId }, include: { payments: true } });
    expect(contract.status).toBe('ACTIVE');
    expect(contract.provider).toBe('MERCADO_PAGO');
    expect(contract.payments).toMatchObject([{ mercadoPagoPaymentId: '123456', method: 'CARD', amountCents: totalPriceCents('exactra') }]);
    expect(await prisma.webhookEvent.count({ where: { stripeEventId: 'mp:123456:approved' } })).toBe(1);
  });

  it('does not activate a contract when the paid amount differs', async () => {
    const { body } = await checkout().expect(201);
    payment = { id: 123457, status: 'approved', external_reference: body.contractId, transaction_amount: 1, payment_type_id: 'credit_card' };
    await webhook('123457').expect(400);
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: body.contractId } })).status).toBe('PENDING_PAYMENT');
  });
});
