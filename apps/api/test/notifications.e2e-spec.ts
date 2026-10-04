import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { ExpiryJob } from '../src/contracts/expiry.job.js';
import { PaymentProvider } from '../src/payments/payment-provider.js';
import type { StripeProvider } from '../src/payments/stripe.provider.js';
import { createApp } from './app.js';
import { checkoutCompleted, sign } from './stripe-fixtures.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));
const sent = vi.mocked(sendEmail);

const DAY = 86400_000;
let n = 0;
async function contract(data: { method: 'PIX' | 'BOLETO' | 'CARD'; endsAt: Date; status?: 'ACTIVE' }) {
  return prisma.contract.create({
    data: {
      plan: 'essencial',
      period: data.method === 'CARD' ? 'MONTHLY' : 'QUARTERLY',
      method: data.method,
      amountCents: 1000,
      status: data.status ?? 'ACTIVE',
      statusToken: `tok_${++n}`,
      startsAt: new Date(data.endsAt.getTime() - 90 * DAY),
      endsAt: data.endsAt,
      customer: { create: { name: 'Ana <b>Lima</b>', email: `ana${n}@ex.com`, phone: '11977776666', document: '12345678909', consentAt: new Date() } },
    },
  });
}

describe('e-mails and expiry job (e2e)', () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    process.env.ADMIN_NOTIFY_EMAIL = 'equipe@exactra.test';
    app = await createApp();
    const stripe = (app.get(PaymentProvider) as StripeProvider).stripe;
    vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({ id: 'cs_n', url: 'https://checkout.stripe.com/x' } as never);
  });
  afterAll(() => app.close());
  beforeEach(() => sent.mockClear());

  it('activation sends the welcome e-mail and the internal notice, with escaped names', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/checkout/sessions')
      .send({
        plan: 'profissional',
        period: 'ANNUAL',
        method: 'PIX',
        consent: true,
        customer: { name: 'Ana <script>x</script>', email: 'ana@ex.com', phone: '11977776666', document: '12345678909' },
      })
      .expect(201);
    const payload = JSON.stringify(checkoutCompleted(body.contractId, { mode: 'payment', paid: true }));
    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', sign(payload))
      .set('content-type', 'application/json')
      .send(payload)
      .expect(200);

    expect(sent.mock.calls.map(([e]) => e.to)).toEqual(['ana@ex.com', 'equipe@exactra.test']);
    expect(sent.mock.calls[0][0].html).toContain('Plano Profissional, 12 meses (Pix)');
    expect(sent.mock.calls[1][0].html).toContain('Ana &lt;script&gt;');
    expect(sent.mock.calls[1][0].html).not.toContain('<script>');
  });

  it('daily job: warns once before the end, expires ended prepaid contracts, ignores card', async () => {
    const now = new Date();
    const soon = await contract({ method: 'BOLETO', endsAt: new Date(now.getTime() + 3 * DAY) });
    const later = await contract({ method: 'PIX', endsAt: new Date(now.getTime() + 30 * DAY) });
    const ended = await contract({ method: 'PIX', endsAt: new Date(now.getTime() - DAY) });
    const card = await contract({ method: 'CARD', endsAt: new Date(now.getTime() - DAY) });
    const job = app.get(ExpiryJob);

    await job.run(now);
    const status = async (id: string) => (await prisma.contract.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(ended.id)).toBe('EXPIRED');
    expect(await status(card.id)).toBe('ACTIVE');
    expect(await status(later.id)).toBe('ACTIVE');
    expect(sent.mock.calls.map(([e]) => e.to)).toContain(`ana${n - 3}@ex.com`); // soon
    expect(sent.mock.calls.map(([e]) => e.to)).not.toContain(`ana${n - 2}@ex.com`); // later
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: soon.id } })).expiryNoticeSentAt).not.toBeNull();

    sent.mockClear();
    await job.run(now);
    expect(sent).not.toHaveBeenCalled();
  });
});
