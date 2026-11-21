import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { adminCustomerDetailSchema, adminCustomersPageSchema, todayInSaoPaulo, uploadTicketSchema } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { PortalJob } from '../src/portal/portal.job.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';
import { stubMercadoPago } from './mercado-pago-fixtures.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));
const sent = vi.mocked(sendEmail);
const mails = () => sent.mock.calls.map(([e]) => e);

const admin = { email: 'equipe-remocao@exactra.test', password: 'senha-forte-123' };

// docs/specs/remover-cliente.md
describe('deactivate and delete a customer (e2e)', () => {
  let app: NestExpressApplication;
  let adminCookie: string;
  const http = () => request(app.getHttpServer());
  const signIn = (email: string, password: string) => http().post('/api/auth/sign-in/email').send({ email, password });
  const cookieOf = (res: request.Response) => res.headers['set-cookie']![0].split(';')[0];
  const as = (cookie: string) => ({
    get: (p: string) => http().get(p).set('cookie', cookie),
    post: (p: string, body?: object) => http().post(p).set('cookie', cookie).send(body),
    del: (p: string, body?: object) => http().delete(p).set('cookie', cookie).send(body),
  });

  /** Manual customer with an activated login. */
  async function customerWithLogin(name: string, email: string, document: string) {
    const today = todayInSaoPaulo();
    const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    const { id } = (await as(adminCookie).post('/admin/customers', { name, email, phone: '11955554444', document, startsAt: today, endsAt: nextYear }).expect(201)).body;
    const token = mails().at(-1)!.text.match(/\/entrar\/ativar\?token=([\w-]+)/)![1];
    await http().post('/account/activate').send({ token, password: 'cliente-123' }).expect(200);
    const res = await signIn(email, 'cliente-123').expect(200);
    return { id: id as string, cookie: cookieOf(res) };
  }

  beforeAll(async () => {
    process.env.STORAGE_LOCAL_DIR = `.storage-test-removal-${process.pid}`;
    stubMercadoPago();
    app = await createApp();
    await seedAdmin(admin.email, admin.password);
    adminCookie = cookieOf(await signIn(admin.email, admin.password).expect(200));
  });
  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
    const { rm } = await import('node:fs/promises');
    await rm(process.env.STORAGE_LOCAL_DIR!, { recursive: true, force: true });
  });
  beforeEach(() => sent.mockClear());

  it('deactivate blocks the login, hides the company and stops e-mails; reactivate brings it back', async () => {
    const { id, cookie } = await customerWithLogin('Oficina Lua', 'dono@oficina.test', '47.960.950/0001-21');
    await as(cookie).get('/app/company').expect(200);

    const detail = adminCustomerDetailSchema.parse((await as(adminCookie).post(`/admin/customers/${id}/deactivate`).expect(200)).body);
    expect(detail.deactivatedAt).not.toBeNull();
    expect(detail.canDelete).toBe(true);

    // The open session no longer reaches the company, and a new sign-in is refused.
    // 401 when the session is gone; 403 while a copy is still in the cookie cache (companyFor).
    expect([401, 403]).toContain((await as(cookie).get('/app/company')).status);
    expect((await signIn('dono@oficina.test', 'cliente-123')).status).not.toBe(200);

    const active = adminCustomersPageSchema.parse((await as(adminCookie).get('/admin/customers').expect(200)).body);
    expect(active.items.map((c) => c.id)).not.toContain(id);
    const inactive = adminCustomersPageSchema.parse((await as(adminCookie).get('/admin/customers?status=inactive').expect(200)).body);
    expect(inactive.items.find((c) => c.id === id)?.deactivatedAt).not.toBeNull();
    const month = (await as(adminCookie).get('/admin/month').expect(200)).body as { items: { customerId: string }[] };
    expect(month.items.map((r) => r.customerId)).not.toContain(id);
    const recipients = (await as(adminCookie).get('/admin/emails/recipients').expect(200)).body as { id: string }[];
    expect(recipients.map((r) => r.id)).not.toContain(id);
    await as(adminCookie).post(`/admin/customers/${id}/invite`).expect(409);

    sent.mockClear();
    await app.get(PortalJob).run();
    expect(mails().filter((m) => m.to === 'dono@oficina.test')).toHaveLength(0);

    await as(adminCookie).post(`/admin/customers/${id}/reactivate`).expect(200);
    const back = await signIn('dono@oficina.test', 'cliente-123').expect(200);
    await as(cookieOf(back)).get('/app/company').expect(200);
  });

  it('delete needs the company name and removes everything, files in the storage included', async () => {
    const { id } = await customerWithLogin('Café São João', 'dono@cafe.test', '11.222.333/0001-81');
    const lead = await prisma.lead.create({ data: { name: 'Dono', whatsapp: '11955554444', answers: {}, result: {}, rulesVersion: 't', consentAt: new Date() } });
    await prisma.customer.update({ where: { id }, data: { leadId: lead.id } });

    const ticket = uploadTicketSchema.parse(
      (await as(adminCookie).post('/admin/uploads', { purpose: 'guide', customerId: id, competence: todayInSaoPaulo().slice(0, 7), fileName: 'das.pdf', sizeBytes: 9 }).expect(201)).body,
    );
    await http().put(new URL(ticket.url).pathname).set(ticket.headers).send(Buffer.from('%PDF-1.4 x')).expect(200);
    await as(adminCookie).post(`/admin/uploads/${ticket.fileId}/complete`).expect(200);
    const { storageKey } = await prisma.storedFile.findUniqueOrThrow({ where: { id: ticket.fileId } });
    const onDisk = join(resolve(process.env.STORAGE_LOCAL_DIR!), storageKey);
    expect(existsSync(onDisk)).toBe(true);

    await as(adminCookie).del(`/admin/customers/${id}`, { confirmName: 'Café Sao' }).expect(400);
    await as(adminCookie).del(`/admin/customers/${id}`, {}).expect(400);
    expect(await prisma.customer.count({ where: { id } })).toBe(1);

    // Case, accents and spaces do not matter.
    await as(adminCookie).del(`/admin/customers/${id}`, { confirmName: '  cafe sao joao ' }).expect(204);
    expect(await prisma.customer.count({ where: { id } })).toBe(0);
    expect(await prisma.contract.count({ where: { customerId: id } })).toBe(0);
    expect(await prisma.storedFile.count({ where: { customerId: id } })).toBe(0);
    expect(await prisma.user.count({ where: { email: 'dono@cafe.test' } })).toBe(0);
    expect(await prisma.lead.count({ where: { id: lead.id } })).toBe(0);
    expect(existsSync(onDisk)).toBe(false);
    await as(adminCookie).get(`/admin/customers/${id}`).expect(404);
    await as(adminCookie).del(`/admin/customers/${id}`, { confirmName: 'Café São João' }).expect(404);
  });

  it('a contract paid through the site blocks delete; deactivate still works', async () => {
    const c = await prisma.customer.create({
      data: {
        name: 'Loja Paga', email: 'paga@loja.test', phone: '11955554444', document: '22333444000181', consentAt: new Date(),
        contracts: { create: { plan: 'exactra', period: 'ANNUAL', method: 'PIX', status: 'ACTIVE', source: 'CHECKOUT', amountCents: 358800, statusToken: `t-${Date.now()}`, startsAt: new Date(), endsAt: new Date(Date.now() + 300 * 86400_000) } },
      },
    });
    const detail = adminCustomerDetailSchema.parse((await as(adminCookie).get(`/admin/customers/${c.id}`).expect(200)).body);
    expect(detail.canDelete).toBe(false);
    await as(adminCookie).del(`/admin/customers/${c.id}`, { confirmName: 'Loja Paga' }).expect(409);
    expect(await prisma.customer.count({ where: { id: c.id } })).toBe(1);
    await as(adminCookie).post(`/admin/customers/${c.id}/deactivate`).expect(200);
  });

  it('a login with another company is kept on deactivate and delete; a new company lifts the deactivation ban', async () => {
    const a = await customerWithLogin('Ateliê Um', 'dona@atelie.test', '44.555.666/0001-81');
    const today = todayInSaoPaulo();
    const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    const b = (await as(adminCookie).post('/admin/customers', { name: 'Ateliê Dois', email: 'dona@atelie.test', phone: '11955554444', document: '55.666.777/0001-81', startsAt: today, endsAt: nextYear }).expect(201)).body.id as string;

    await as(adminCookie).post(`/admin/customers/${a.id}/deactivate`).expect(200);
    const login = await signIn('dona@atelie.test', 'cliente-123').expect(200);
    expect((await as(cookieOf(login)).get('/app/company').expect(200)).body.name).toBe('Ateliê Dois');

    await as(adminCookie).del(`/admin/customers/${a.id}`, { confirmName: 'Ateliê Um' }).expect(204);
    expect(await prisma.user.count({ where: { email: 'dona@atelie.test' } })).toBe(1);
    expect(await prisma.companyMember.count({ where: { customerId: b } })).toBe(1);

    // The only company deactivated: banned. A new company for the same person brings the login back.
    await as(adminCookie).post(`/admin/customers/${b}/deactivate`).expect(200);
    expect((await signIn('dona@atelie.test', 'cliente-123')).status).not.toBe(200);
    await as(adminCookie).post('/admin/customers', { name: 'Ateliê Três', email: 'dona@atelie.test', phone: '11955554444', document: '66.777.888/0001-81', startsAt: today, endsAt: nextYear }).expect(201);
    await signIn('dona@atelie.test', 'cliente-123').expect(200);
  });

  it('delete removes guides with receipts, manual payments and keeps a lead shared with another company', async () => {
    const { id } = await customerWithLogin('Bistrô Norte', 'dono@bistro.test', '77.888.999/0001-81');
    const other = await prisma.customer.create({ data: { name: 'Outra', email: 'o@bistro.test', phone: '11999990000', document: '11111111111', consentAt: new Date() } });
    const lead = await prisma.lead.create({ data: { name: 'Dono', whatsapp: '11955554444', answers: {}, result: {}, rulesVersion: 't', consentAt: new Date(), customers: { connect: [{ id }, { id: other.id }] } } });
    const file = (kind: 'GUIDE' | 'RECEIPT', key: string) =>
      prisma.storedFile.create({ data: { customerId: id, kind, storageKey: key, fileName: 'x.pdf', contentType: 'application/pdf', sizeBytes: 1, competence: '2026-10', uploadedAt: new Date() } });
    const guide = await file('GUIDE', `customers/${id}/g.pdf`);
    const receipt = await file('RECEIPT', `customers/${id}/r.pdf`);
    await prisma.taxGuide.create({ data: { customerId: id, type: 'DAS', competence: '2026-10', amountCents: 100, dueDate: new Date(), fileId: guide.id, receiptFileId: receipt.id, paidAt: new Date() } });
    const contract = await prisma.contract.findFirstOrThrow({ where: { customerId: id } });
    await prisma.payment.create({ data: { contractId: contract.id, amountCents: 100, status: 'PAID', method: 'BOLETO', paidAt: new Date() } });

    await as(adminCookie).del(`/admin/customers/${id}`, { confirmName: 'Bistrô Norte' }).expect(204);
    expect(await prisma.taxGuide.count({ where: { customerId: id } })).toBe(0);
    expect(await prisma.payment.count({ where: { contractId: contract.id } })).toBe(0);
    expect(await prisma.lead.count({ where: { id: lead.id } })).toBe(1);
  });

  it('an open site checkout blocks delete until the company is deactivated, which cancels it', async () => {
    const c = await prisma.customer.create({
      data: {
        name: 'Loja Aberta', email: 'aberta@loja.test', phone: '11955554444', document: '88999000000181', consentAt: new Date(),
        contracts: { create: { plan: 'exactra', period: 'ANNUAL', method: 'PIX', status: 'PENDING_PAYMENT', source: 'CHECKOUT', amountCents: 358800, statusToken: `p-${Date.now()}` } },
      },
    });
    await as(adminCookie).del(`/admin/customers/${c.id}`, { confirmName: 'Loja Aberta' }).expect(409);
    await as(adminCookie).post(`/admin/customers/${c.id}/deactivate`).expect(200);
    expect((await prisma.contract.findFirstOrThrow({ where: { customerId: c.id } })).status).toBe('CANCELED');
    await as(adminCookie).del(`/admin/customers/${c.id}`, { confirmName: 'Loja Aberta' }).expect(204);
  });

  it('only admins can deactivate or delete', async () => {
    const { id, cookie } = await customerWithLogin('Banca Sol', 'dono@banca.test', '33.444.555/0001-81');
    await as(cookie).post(`/admin/customers/${id}/deactivate`).expect(403);
    await as(cookie).del(`/admin/customers/${id}`, { confirmName: 'Banca Sol' }).expect(403);
    await http().delete(`/admin/customers/${id}`).send({ confirmName: 'Banca Sol' }).expect(401);
  });
});
