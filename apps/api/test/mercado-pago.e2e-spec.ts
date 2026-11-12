import { createHmac } from 'node:crypto';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { totalPriceCents } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { MercadoPagoProvider } from '../src/payments/mercado-pago.provider.js';
import { createApp } from './app.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));
const sent = vi.mocked(sendEmail);
const alerts = () => sent.mock.calls.map(([e]) => e).filter((e) => e.to === 'equipe@exactra.test').map((e) => e.subject);

const customer = { name: 'João Souza', email: 'mp@ex.com', phone: '11988887777', document: '123.456.789-09' };
const secret = 'mp_test_webhook_secret';

describe('Mercado Pago checkout and webhook (e2e)', () => {
  let app: NestExpressApplication;
  let fetchMock: ReturnType<typeof vi.fn>;
  let preferenceNumber = 0;
  let payment: { id: number; status: string; status_detail?: string; transaction_amount_refunded?: number; external_reference: string; transaction_amount: number; payment_type_id: string };

  beforeAll(async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR_test';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_MODE = 'test';
    process.env.ADMIN_NOTIFY_EMAIL = 'equipe@exactra.test';
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
    delete process.env.ADMIN_NOTIFY_EMAIL;
  });
  beforeEach(() => sent.mockClear());

  const http = () => request(app.getHttpServer());
  const checkout = () => http().post('/checkout/sessions').send({ plan: 'exactra', period: 'ANNUAL', method: 'CARD', provider: 'MERCADO_PAGO', customer, consent: true });
  const webhook = (id: string, valid = true, ts = String(Date.now())) => {
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
    // The link lasts 3 days, for the checkout and for any Pix or boleto generated from it.
    expect(requestBody.expires).toBe(true);
    expect(requestBody.date_of_expiration).toMatch(/-03:00$/);
    expect(requestBody.expiration_date_to).toBe(requestBody.date_of_expiration);
    const days = (Date.parse(requestBody.expiration_date_to) - Date.now()) / 86400_000;
    expect(days).toBeGreaterThan(2.99);
    expect(days).toBeLessThanOrEqual(3);
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
    expect(await prisma.webhookEvent.count({ where: { eventId: 'mp:123456:approved' } })).toBe(1);
  });

  const price = totalPriceCents('exactra') / 100;
  const status = async (id: string) => (await prisma.contract.findUniqueOrThrow({ where: { id } })).status;
  let nextPayment = 200000;
  /** Delivers a verified webhook for a payment in the given state. */
  const deliver = (contractId: string, state: string, extra: Partial<typeof payment> = {}, id = ++nextPayment) => {
    payment = { id, status: state, external_reference: contractId, transaction_amount: price, payment_type_id: 'credit_card', ...extra };
    return webhook(String(id));
  };
  const paidContract = async () => {
    const { body } = await checkout().expect(201);
    const id = ++nextPayment;
    await deliver(body.contractId, 'approved', {}, id).expect(200);
    expect(await status(body.contractId)).toBe('ACTIVE');
    sent.mockClear();
    return { contractId: body.contractId as string, id };
  };

  it('accepts a signed notification whatever the age or unit of ts, and still refuses a bad signature', async () => {
    const { body } = await checkout().expect(201);
    payment = { id: 300001, status: 'pending', external_reference: body.contractId, transaction_amount: price, payment_type_id: 'ticket' };
    await webhook('300001', true, '1704908010').expect(200); // seconds, from 2024
    await webhook('300001', false, '1704908010').expect(400);
  });

  it('warns once and keeps the contract when the paid amount differs', async () => {
    const { body } = await checkout().expect(201);
    await deliver(body.contractId, 'approved', { transaction_amount: 1 }, 123457).expect(200);
    await deliver(body.contractId, 'approved', { transaction_amount: 1 }, 123457).expect(200); // retry
    expect(await status(body.contractId)).toBe('PENDING_PAYMENT');
    expect(alerts()).toEqual([expect.stringContaining('não confere')]);
  });

  it('warns when the payment names a contract that does not exist', async () => {
    await deliver('contrato-inexistente', 'approved').expect(200);
    expect(alerts()).toEqual([expect.stringContaining('não confere')]);
  });

  it('warns about a payment for a contract no longer waiting for one', async () => {
    const { contractId } = await paidContract();
    await deliver(contractId, 'approved').expect(200); // a second payment
    expect(await status(contractId)).toBe('ACTIVE');
    expect(await prisma.payment.count({ where: { contractId } })).toBe(1);

    const canceled = await checkout().expect(201);
    await prisma.contract.update({ where: { id: canceled.body.contractId }, data: { status: 'CANCELED' } });
    await deliver(canceled.body.contractId, 'approved').expect(200);
    expect(await status(canceled.body.contractId)).toBe('CANCELED');
    expect(alerts()).toEqual([expect.stringContaining('já resolvido'), expect.stringContaining('já resolvido')]);
  });

  it.each([
    ['refunded', undefined, 'reembolsado'],
    ['charged_back', 'in_process', 'Chargeback recebido'],
  ])('%s cancels the contract and warns once', async (state, detail, subject) => {
    const { contractId, id } = await paidContract();
    await deliver(contractId, state, { status_detail: detail }, id).expect(200);
    await deliver(contractId, state, { status_detail: detail }, id).expect(200); // retry
    expect(await status(contractId)).toBe('CANCELED');
    expect(alerts()).toEqual([expect.stringContaining(subject)]);
  });

  it('refunding a payment that did not activate the contract keeps it active and warns', async () => {
    const { contractId } = await paidContract();
    await deliver(contractId, 'refunded').expect(200);
    expect(await status(contractId)).toBe('ACTIVE');
    expect(alerts()).toEqual([expect.stringContaining('sem mudança')]);
  });

  it('partial refund, dispute and reversed chargeback only warn', async () => {
    const { contractId, id } = await paidContract();
    await deliver(contractId, 'approved', { status_detail: 'partially_refunded', transaction_amount_refunded: 10 }, id).expect(200);
    await deliver(contractId, 'approved', { status_detail: 'partially_refunded', transaction_amount_refunded: 10 }, id).expect(200); // retry
    await deliver(contractId, 'approved', { status_detail: 'partially_refunded', transaction_amount_refunded: 25 }, id).expect(200); // another refund
    await deliver(contractId, 'in_mediation', {}, id).expect(200);
    await deliver(contractId, 'charged_back', { status_detail: 'reimbursed' }, id).expect(200);
    expect(await status(contractId)).toBe('ACTIVE');
    expect(alerts()).toEqual([
      expect.stringContaining('parcial'),
      expect.stringContaining('parcial'),
      expect.stringContaining('disputa'),
      expect.stringContaining('revertido'),
    ]);
  });

  it.each(['rejected', 'cancelled'])('%s keeps the contract waiting: the buyer can retry on the same link', async (state) => {
    const { body } = await checkout().expect(201);
    await deliver(body.contractId, state).expect(200);
    expect(await status(body.contractId)).toBe('PENDING_PAYMENT');
    expect(alerts()).toEqual([]);
    await deliver(body.contractId, 'approved').expect(200);
    expect(await status(body.contractId)).toBe('ACTIVE');
  });
});
