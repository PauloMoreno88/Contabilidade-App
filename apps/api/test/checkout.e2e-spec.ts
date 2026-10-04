import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { totalPriceCents } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { PaymentProvider } from '../src/payments/payment-provider.js';
import type { StripeProvider } from '../src/payments/stripe.provider.js';
import { createApp } from './app.js';
import { asyncPayment, checkoutCompleted, invoice, sign, subscriptionDeleted } from './stripe-fixtures.js';

const customer = { name: 'João Souza', email: 'joao@ex.com', phone: '11988887777', document: '123.456.789-09' };

describe('checkout + Stripe webhooks (e2e)', () => {
  let app: NestExpressApplication;
  let createSession: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    app = await createApp();
    const stripe = (app.get(PaymentProvider) as StripeProvider).stripe;
    createSession = vi
      .spyOn(stripe.checkout.sessions, 'create')
      .mockImplementation(async () => ({ id: `cs_${Math.random()}`, url: 'https://checkout.stripe.com/c/pay/cs_test' }) as never);
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());
  const checkout = (body: object) => http().post('/checkout/sessions').send({ customer, consent: true, ...body });
  const webhook = (evt: object) => {
    const payload = JSON.stringify(evt);
    return http().post('/webhooks/stripe').set('stripe-signature', sign(payload)).set('content-type', 'application/json').send(payload);
  };
  const contract = (id: string) => prisma.contract.findUniqueOrThrow({ where: { id }, include: { payments: true } });

  it('creates a card subscription checkout with the shared price', async () => {
    const res = await checkout({ plan: 'profissional', period: 'MONTHLY', method: 'CARD' }).expect(201);
    expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
    const params = createSession.mock.lastCall![0];
    expect(params.mode).toBe('subscription');
    expect(params.allowed_payment_method_types).toEqual(['card']);
    expect(params.line_items[0].price_data.unit_amount).toBe(totalPriceCents('profissional', 'MONTHLY'));
    expect(params.success_url).toContain(`token=${res.body.statusToken}`);

    const c = await contract(res.body.contractId);
    expect(c.status).toBe('PENDING_PAYMENT');
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: c.customerId } })).document).toBe('12345678909');
  });

  it('rejects card with a prepaid period and Pix with monthly', async () => {
    await checkout({ plan: 'essencial', period: 'ANNUAL', method: 'CARD' }).expect(400);
    await checkout({ plan: 'essencial', period: 'MONTHLY', method: 'PIX' }).expect(400);
  });

  it('status endpoint needs the token', async () => {
    const res = await checkout({ plan: 'essencial', period: 'QUARTERLY', method: 'PIX' }).expect(201);
    const { contractId, statusToken } = res.body;
    await http().get(`/contracts/${contractId}/status`).expect(404);
    await http().get(`/contracts/${contractId}/status?token=wrong`).expect(404);
    const ok = await http().get(`/contracts/${contractId}/status?token=${statusToken}`).expect(200);
    expect(ok.body).toEqual({ contractId, status: 'PENDING_PAYMENT', method: 'PIX', plan: 'essencial', period: 'QUARTERLY' });
  });

  it('rejects webhooks with a bad signature', () =>
    http().post('/webhooks/stripe').set('stripe-signature', 't=1,v1=bad').send({ id: 'evt_x' }).expect(400));

  it('boleto: stays pending until the async payment succeeds, then activates for the prepaid period', async () => {
    const { body } = await checkout({ plan: 'essencial', period: 'SEMIANNUAL', method: 'BOLETO' }).expect(201);
    expect(createSession.mock.lastCall![0].allowed_payment_method_types).toEqual(['boleto']);

    await webhook(checkoutCompleted(body.contractId, { mode: 'payment', paid: false })).expect(200);
    expect((await contract(body.contractId)).status).toBe('PENDING_PAYMENT');

    await webhook(asyncPayment(body.contractId, true)).expect(200);
    const c = await contract(body.contractId);
    expect(c.status).toBe('ACTIVE');
    expect(c.payments).toHaveLength(1);
    const months = (c.endsAt!.getFullYear() - c.startsAt!.getFullYear()) * 12 + c.endsAt!.getMonth() - c.startsAt!.getMonth();
    expect(months).toBe(6);
  });

  it('is idempotent: the same event twice is applied once', async () => {
    const { body } = await checkout({ plan: 'essencial', period: 'ANNUAL', method: 'PIX' }).expect(201);
    const evt = checkoutCompleted(body.contractId, { mode: 'payment', paid: true });
    await webhook(evt).expect(200);
    const dup = await webhook(evt).expect(200);
    expect(dup.body.duplicate).toBe(true);
    expect((await contract(body.contractId)).payments).toHaveLength(1);
    expect(await prisma.webhookEvent.count({ where: { stripeEventId: evt.id } })).toBe(1);
  });

  it('async payment failure cancels the pending contract', async () => {
    const { body } = await checkout({ plan: 'essencial', period: 'QUARTERLY', method: 'BOLETO' }).expect(201);
    await webhook(asyncPayment(body.contractId, false)).expect(200);
    expect((await contract(body.contractId)).status).toBe('CANCELED');
  });

  it('card: activates, renews on invoice.paid, goes PAST_DUE on failure and CANCELED on deletion', async () => {
    const { body } = await checkout({ plan: 'profissional', period: 'MONTHLY', method: 'CARD' }).expect(201);
    const sub = `sub_${body.contractId}`;

    await webhook(checkoutCompleted(body.contractId, { mode: 'subscription', paid: true })).expect(200);
    expect((await contract(body.contractId)).status).toBe('ACTIVE');

    const nextEnd = new Date(Date.now() + 60 * 86400_000);
    await webhook(invoice('invoice.paid', sub, nextEnd)).expect(200);
    let c = await contract(body.contractId);
    expect(c.endsAt!.getTime()).toBe(Math.floor(nextEnd.getTime() / 1000) * 1000);
    expect(c.payments).toHaveLength(1);

    await webhook(invoice('invoice.payment_failed', sub, nextEnd)).expect(200);
    expect((await contract(body.contractId)).status).toBe('PAST_DUE');

    await webhook(subscriptionDeleted(sub)).expect(200);
    c = await contract(body.contractId);
    expect(c.status).toBe('CANCELED');
  });

  it('removes the pending contract when Stripe fails', async () => {
    createSession.mockRejectedValueOnce(new Error('stripe down'));
    const before = await prisma.contract.count();
    await checkout({ plan: 'essencial', period: 'MONTHLY', method: 'CARD' }).expect(500);
    expect(await prisma.contract.count()).toBe(before);
  });
});
