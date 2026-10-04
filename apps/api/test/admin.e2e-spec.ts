import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  adminContractDetailSchema,
  adminContractsPageSchema,
  adminLeadsPageSchema,
  adminMetricsSchema,
  calculateSimulation,
} from '@exactra/shared';
import { auth } from '../src/auth.js';
import { prisma } from '../src/db.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';

const DAY = 86400_000;
const leadAnswers = { profile: 'servicos', monthlyRevenue: 12000, hasCnpj: true, employees: 'none', currentRegime: 'mei' } as const;
const admin = { email: 'chefe@exactra.test', password: 'senha-forte-123' };
const user = { email: 'comum@exactra.test', password: 'senha-forte-456' };

let n = 0;
const contract = (o: { name: string; method: 'PIX' | 'CARD'; status: 'ACTIVE' | 'PENDING_PAYMENT'; endsInDays?: number }) =>
  prisma.contract.create({
    data: {
      plan: o.method === 'CARD' ? 'profissional' : 'essencial',
      period: o.method === 'CARD' ? 'MONTHLY' : 'QUARTERLY',
      method: o.method,
      amountCents: 10000,
      status: o.status,
      statusToken: `adm_${++n}`,
      startsAt: o.status === 'ACTIVE' ? new Date() : null,
      endsAt: o.endsInDays === undefined ? null : new Date(Date.now() + o.endsInDays * DAY),
      customer: {
        create: { name: o.name, email: `c${n}@ex.com`, phone: '11955554444', document: '98765432100', consentAt: new Date() },
      },
      payments: o.status === 'ACTIVE' ? { create: { amountCents: 10000, status: 'PAID', method: o.method, paidAt: new Date() } } : undefined,
    },
  });

describe('admin endpoints (e2e)', () => {
  let app: NestExpressApplication;
  let adminCookie: string;
  let userCookie: string;

  const signIn = async (creds: typeof admin) => {
    const res = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send(creds).expect(200);
    return res.headers['set-cookie']![0].split(';')[0];
  };
  const get = (path: string, cookie?: string) => {
    const r = request(app.getHttpServer()).get(path);
    return cookie ? r.set('cookie', cookie) : r;
  };

  beforeAll(async () => {
    app = await createApp();
    await prisma.$executeRawUnsafe('TRUNCATE "Payment", "Contract", "Customer", "Lead" CASCADE');
    await seedAdmin(admin.email, admin.password);
    await auth.api.createUser({ body: { ...user, name: 'Comum', role: 'user' } });
    adminCookie = await signIn(admin);
    userCookie = await signIn(user);

    await contract({ name: 'Carla Pix', method: 'PIX', status: 'ACTIVE', endsInDays: 10 });
    await contract({ name: 'Bruno Cartão', method: 'CARD', status: 'ACTIVE', endsInDays: 30 });
    await contract({ name: '=HYPERLINK("x")', method: 'PIX', status: 'PENDING_PAYMENT' });
    await prisma.lead.create({
      data: {
        name: 'Lia Lead',
        whatsapp: '11911112222',
        answers: leadAnswers,
        result: calculateSimulation(leadAnswers),
        utm: { source: 'google', campaign: 'abertura' },
        rulesVersion: 'placeholder-0',
        consentAt: new Date(),
      },
    });
  });
  afterAll(() => app.close());

  it('CORS: allows WEB_ORIGIN with credentials and exposes the CSV filename', async () => {
    const pre = await request(app.getHttpServer())
      .options('/admin/contracts.csv')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(pre.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(pre.headers['access-control-allow-credentials']).toBe('true');
    const res = await get('/admin/contracts.csv', adminCookie).set('Origin', 'http://localhost:3000').expect(200);
    expect(res.headers['access-control-expose-headers']).toContain('Content-Disposition');
    const other = await get('/health').set('Origin', 'https://evil.example').expect(200);
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('requires a session (401) and the admin role (403)', async () => {
    await get('/admin/metrics').expect(401);
    await get('/admin/metrics', userCookie).expect(403);
    await get('/admin/contracts.csv', userCookie).expect(403);
  });

  it('GET /admin/metrics matches the shared schema', async () => {
    const { body } = await get('/admin/metrics', adminCookie).expect(200);
    expect(adminMetricsSchema.parse(body)).toEqual({
      activeCustomers: 2,
      newThisMonth: 2,
      contractedRevenueCents: 20000,
      pendingPayment: 1,
      expiringIn30Days: 1,
      byPlan: { essencial: 1, profissional: 1 },
      byMethod: { PIX: 1, CARD: 1 },
    });
  });

  it('GET /admin/contracts filters, searches and paginates', async () => {
    const all = await get('/admin/contracts', adminCookie).expect(200);
    expect(all.body.total).toBe(3);
    adminContractsPageSchema.parse(all.body);

    const pix = await get('/admin/contracts?method=PIX&status=ACTIVE', adminCookie).expect(200);
    expect(pix.body.items.map((r: { customerName: string }) => r.customerName)).toEqual(['Carla Pix']);

    const search = await get('/admin/contracts?q=bruno', adminCookie).expect(200);
    expect(search.body.total).toBe(1);

    const page = await get('/admin/contracts?pageSize=2&page=2', adminCookie).expect(200);
    expect(page.body.items).toHaveLength(1);

    await get('/admin/contracts?status=WHATEVER', adminCookie).expect(400);
  });

  it('GET /admin/contracts/:id returns customer and payment history', async () => {
    const { body } = await get('/admin/contracts?q=carla', adminCookie);
    const detail = await get(`/admin/contracts/${body.items[0].id}`, adminCookie).expect(200);
    const d = adminContractDetailSchema.parse(detail.body);
    expect(d.customer.name).toBe('Carla Pix');
    expect(d.customer.lead).toBeNull();
    expect(d.amountCents).toBe(10000);
    expect(d.payments).toEqual([
      expect.objectContaining({ amountCents: 10000, status: 'PAID', method: 'PIX', paidAt: expect.any(String) }),
    ]);
    expect(detail.body).not.toHaveProperty('statusToken'); // internal fields are stripped
    await get('/admin/contracts/nope', adminCookie).expect(404);
  });

  it('GET /admin/leads lists leads', async () => {
    const { body } = await get('/admin/leads?q=lia', adminCookie).expect(200);
    expect(body.total).toBe(1);
    const lead = adminLeadsPageSchema.parse(body).items[0];
    expect(lead).toMatchObject({
      name: 'Lia Lead',
      whatsapp: '11911112222',
      email: null,
      answers: { monthlyRevenue: 12000 },
      result: { recommendedPlan: 'profissional' },
      utm: { source: 'google', campaign: 'abertura' },
      rulesVersion: 'placeholder-0',
    });
  });

  it('GET /admin/contracts.csv exports with BOM, ";" and formula neutralization', async () => {
    const res = await get('/admin/contracts.csv', adminCookie).expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('contratos.csv');
    const lines = res.text.replace(/^﻿/, '').split('\r\n');
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('"Cliente";"E-mail"');
    expect(res.text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(res.text).toContain('"100,00"');
  });
});
