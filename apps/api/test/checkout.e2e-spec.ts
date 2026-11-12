import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { totalPriceCents } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { createApp } from './app.js';
import { mpPay, stubMercadoPago } from './mercado-pago-fixtures.js';

const customer = { name: 'João Souza', email: 'joao@ex.com', phone: '11988887777', document: '123.456.789-09' };

// Webhook edge cases (refunds, chargebacks, alerts) are in mercado-pago.e2e-spec.ts.
describe('checkout (e2e)', () => {
  let app: NestExpressApplication;
  let fetchMock: ReturnType<typeof stubMercadoPago>;

  beforeAll(async () => {
    fetchMock = stubMercadoPago();
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  const http = () => request(app.getHttpServer());
  const checkout = (body: object) => http().post('/checkout/sessions').send({ customer, consent: true, ...body });
  const contract = (id: string) => prisma.contract.findUniqueOrThrow({ where: { id }, include: { payments: true } });
  const lastPreference = () => JSON.parse(fetchMock.mock.lastCall![1]!.body as string);

  it('creates a Mercado Pago checkout for the annual price, whatever provider the request names', async () => {
    const res = await checkout({ plan: 'exactra', period: 'ANNUAL', method: 'CARD', provider: 'STRIPE' }).expect(201);
    expect(res.body.checkoutUrl).toContain('mercadopago.com.br');
    const pref = lastPreference();
    expect(pref.items[0].unit_price).toBe(totalPriceCents('exactra') / 100);
    expect(pref.back_urls).toEqual({
      success: `http://localhost:3000/checkout/status?contract=${res.body.contractId}&token=${res.body.statusToken}`,
      pending: `http://localhost:3000/checkout/status?contract=${res.body.contractId}&token=${res.body.statusToken}`,
      failure: 'http://localhost:3000/checkout?cancelado=1&plan=exactra',
    });

    const c = await contract(res.body.contractId);
    expect(c).toMatchObject({ status: 'PENDING_PAYMENT', provider: 'MERCADO_PAGO', amountCents: totalPriceCents('exactra') });
    expect(c.mercadoPagoPreferenceId).toMatch(/^pref_test_/);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: c.customerId } })).document).toBe('12345678909');
  });

  it('sells only the annual contract of the current plan', async () => {
    // Plans sold before the single plan can no longer be bought.
    await checkout({ plan: 'essencial', period: 'ANNUAL', method: 'CARD' }).expect(400);
    await checkout({ plan: 'exactra', period: 'MONTHLY', method: 'CARD' }).expect(400);
    await checkout({ plan: 'exactra', period: 'QUARTERLY', method: 'PIX' }).expect(400);
  });

  it('status endpoint needs the token', async () => {
    const res = await checkout({ plan: 'exactra', period: 'ANNUAL', method: 'CARD' }).expect(201);
    const { contractId, statusToken } = res.body;
    await http().get(`/contracts/${contractId}/status`).expect(404);
    await http().get(`/contracts/${contractId}/status?token=wrong`).expect(404);
    const ok = await http().get(`/contracts/${contractId}/status?token=${statusToken}`).expect(200);
    expect(ok.body).toEqual({ contractId, status: 'PENDING_PAYMENT', method: 'CARD', provider: 'MERCADO_PAGO', plan: 'exactra', period: 'ANNUAL' });
  });

  it('no Stripe webhook route anymore', () => http().post('/webhooks/stripe').send({ id: 'evt_x' }).expect(404));

  it('boleto: stays pending until paid, then activates for one year with the real method', async () => {
    const { body } = await checkout({ plan: 'exactra', period: 'ANNUAL', method: 'CARD' }).expect(201);
    await mpPay(http, body.contractId, { status: 'pending', type: 'ticket' });
    expect((await contract(body.contractId)).status).toBe('PENDING_PAYMENT');

    await mpPay(http, body.contractId, { type: 'ticket' });
    const c = await contract(body.contractId);
    expect(c).toMatchObject({ status: 'ACTIVE', method: 'BOLETO' });
    expect(c.payments).toMatchObject([{ method: 'BOLETO', status: 'PAID' }]);
    const months = (c.endsAt!.getFullYear() - c.startsAt!.getFullYear()) * 12 + c.endsAt!.getMonth() - c.startsAt!.getMonth();
    expect(months).toBe(12);
  });

  it('removes the pending contract when Mercado Pago fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const before = await prisma.contract.count();
    await checkout({ plan: 'exactra', period: 'ANNUAL', method: 'CARD' }).expect(500);
    expect(await prisma.contract.count()).toBe(before);
  });
});
