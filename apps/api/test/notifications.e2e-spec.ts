import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { prisma } from '../src/db.js';
import { sendEmail, type Email } from '../src/email.js';
import { ExpiryJob } from '../src/contracts/expiry.job.js';
import { PaymentProvider } from '../src/payments/payment-provider.js';
import type { StripeProvider } from '../src/payments/stripe.provider.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';
import { checkoutCompleted, sign } from './stripe-fixtures.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));
const sent = vi.mocked(sendEmail);
const mails = () => sent.mock.calls.map(([e]) => e);

const EVIL = '<script>alert(1)</script>';
const DAY = 86400_000;

/** Rendered by @exactra/emails: subject, html and plain text, with the user-provided name escaped in the HTML. */
function expectRendered(e: Email) {
  expect(e.subject.length).toBeGreaterThan(0);
  expect(e.subject).not.toMatch(/[\r\n]/);
  expect(e.html).toMatch(/^<!DOCTYPE html/i);
  expect(e.text.length).toBeGreaterThan(0);
  expect(e.html).not.toContain('<script');
  expect(e.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
}

let n = 0;
async function contract(data: { method: 'PIX' | 'BOLETO' | 'CARD'; endsAt: Date }) {
  return prisma.contract.create({
    data: {
      plan: 'essencial',
      period: data.method === 'CARD' ? 'MONTHLY' : 'QUARTERLY',
      method: data.method,
      amountCents: 59700,
      status: 'ACTIVE',
      statusToken: `tok_${++n}`,
      startsAt: new Date(data.endsAt.getTime() - 90 * DAY),
      endsAt: data.endsAt,
      customer: {
        create: { name: `${EVIL} Ana`, email: `ana${n}@ex.com`, phone: '11977776666', document: '12345678909', consentAt: new Date() },
      },
    },
  });
}

describe('e-mails and expiry job (e2e)', () => {
  let app: NestExpressApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.ADMIN_NOTIFY_EMAIL = 'equipe@exactra.test';
    process.env.EMAIL_ASSET_BASE_URL = 'https://www.exactra.test';
    app = await createApp();
    const stripe = (app.get(PaymentProvider) as StripeProvider).stripe;
    vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({ id: 'cs_n', url: 'https://checkout.stripe.com/x' } as never);
  });
  afterAll(() => app.close());
  beforeEach(() => sent.mockClear());

  it('activation: welcome e-mail + internal notice with real contract data, names escaped', async () => {
    const lead = await http()
      .post('/leads')
      .send({
        name: 'Ana',
        whatsapp: '11977776666',
        consent: true,
        utm: { source: 'google', campaign: 'lancamento' },
        answers: { profile: 'servicos', monthlyRevenue: 15000, hasCnpj: false, employees: 'none', currentRegime: 'autonomo' },
        result: { rulesVersion: 'x', suggestedRegime: 'x', estimatedTaxMinCents: 0, estimatedTaxMaxCents: 1, estimatedNetCents: 0, recommendedPlan: 'essencial', disclaimer: 'x', isPlaceholder: true },
      })
      .expect(201);
    const { body } = await http()
      .post('/checkout/sessions')
      .send({
        plan: 'profissional',
        period: 'ANNUAL',
        method: 'PIX',
        consent: true,
        leadId: lead.body.id,
        customer: { name: `${EVIL} Ana`, email: 'ana@ex.com', phone: '11977776666', document: '123.456.789-09' },
      })
      .expect(201);
    const payload = JSON.stringify(checkoutCompleted(body.contractId, { mode: 'payment', paid: true }));
    await http().post('/webhooks/stripe').set('stripe-signature', sign(payload)).set('content-type', 'application/json').send(payload).expect(200);

    const [welcome, notice] = mails();
    expect(mails().map((e) => e.to)).toEqual(['ana@ex.com', 'equipe@exactra.test']);
    expectRendered(welcome);
    expect(welcome.text).toContain('Profissional');
    expectRendered(notice);
    expect(notice.text).toContain('ana@ex.com');
    expect(notice.text).toContain('google / lancamento');
    expect(notice.html).toContain(`/admin/contrato?id=${body.contractId}`);
  });

  it('password reset and 2FA code e-mails go through the templates', async () => {
    const email = 'admin-mail@exactra.test';
    const password = 'senha-forte-123';
    await seedAdmin(email, password);
    await prisma.user.update({ where: { email }, data: { name: `${EVIL} Admin` } });

    await http().post('/api/auth/request-password-reset').send({ email, redirectTo: 'http://localhost:3000/admin/redefinir-senha' }).expect(200);
    const [reset] = mails();
    expect(reset.to).toBe(email);
    expectRendered(reset);
    expect(reset.html).toContain('/api/auth/reset-password/');
    expect(reset.text).toContain('60 minutos');

    sent.mockClear();
    await prisma.user.update({ where: { email }, data: { twoFactorEnabled: true } });
    const signIn = await http().post('/api/auth/sign-in/email').send({ email, password }).expect(200);
    expect(signIn.body.twoFactorRedirect).toBe(true);
    const cookie = signIn.headers['set-cookie'] as unknown as string[];
    await http().post('/api/auth/two-factor/send-otp').set('cookie', cookie.map((c) => c.split(';')[0]).join('; ')).send({}).expect(200);
    const [otp] = mails();
    expect(otp.to).toBe(email);
    expectRendered(otp);
    expect(otp.text).toMatch(/\b\d{6}\b/);
    expect(otp.text).toContain('3 minutos');
  });

  it('daily job: reminder e-mail before the end, expires ended prepaid contracts, ignores card', async () => {
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

    const reminders = mails();
    expect(reminders.map((e) => e.to)).toEqual([`ana${n - 3}@ex.com`]); // only "soon"
    expectRendered(reminders[0]);
    expect(reminders[0].html).toContain('https://www.exactra.test/checkout?plan=essencial');
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: soon.id } })).expiryNoticeSentAt).not.toBeNull();

    sent.mockClear();
    await job.run(now);
    expect(sent).not.toHaveBeenCalled();
  });
});
