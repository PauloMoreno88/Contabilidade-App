import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RULES_VERSION } from '@exactra/shared';
import { prisma } from '../src/db.js';
import { LEAD_RETENTION_DAYS, LeadRetentionJob } from '../src/lead-retention.job.js';
import { createApp } from './app.js';

const answers = { profile: 'servicos', monthlyRevenue: 15000, hasCnpj: false, employees: 'none', currentRegime: 'autonomo' };
const lead = {
  name: 'Maria Silva',
  whatsapp: '11999998888',
  answers,
  // Tampered result: the API must ignore it.
  result: {
    rulesVersion: 'fake',
    suggestedRegime: 'x',
    estimatedTaxMinCents: 0,
    estimatedTaxMaxCents: 1,
    estimatedNetCents: 0,
    recommendedPlan: 'essencial',
    disclaimer: 'x',
    isPlaceholder: false,
  },
  utm: { source: 'google', campaign: 'abertura' },
  consent: true,
};

describe('POST /leads (e2e)', () => {
  let app: NestExpressApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(() => app.close());

  it('stores the lead with a server-side result', async () => {
    const res = await request(app.getHttpServer()).post('/leads').send(lead).expect(201);
    const saved = await prisma.lead.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved.rulesVersion).toBe(RULES_VERSION);
    expect(saved.utm).toEqual(lead.utm);
    expect(res.body.result.recommendedPlan).toBe('exactra');
    expect(saved.consentAt).toBeInstanceOf(Date);
  });

  it('requires consent', () =>
    request(app.getHttpServer()).post('/leads').send({ ...lead, consent: false }).expect(400));

  it('rejects invalid answers', () =>
    request(app.getHttpServer())
      .post('/leads')
      .send({ ...lead, answers: { ...answers, monthlyRevenue: -1 } })
      .expect(400));

  it('retention job deletes old leads that never became a customer', async () => {
    const day = 86400_000;
    const old = new Date(Date.now() - (LEAD_RETENTION_DAYS + 1) * day);
    const data = { name: 'Old', whatsapp: '11999998888', answers, result: {}, rulesVersion: RULES_VERSION, consentAt: old, createdAt: old };
    const stale = await prisma.lead.create({ data });
    const fresh = await prisma.lead.create({ data: { ...data, createdAt: new Date(Date.now() - (LEAD_RETENTION_DAYS - 1) * day) } });
    const hired = await prisma.lead.create({
      data: { ...data, customers: { create: { name: 'Old', email: 'old@ex.com', phone: '11999998888', document: '12345678909', consentAt: old } } },
    });

    const { deleted } = await app.get(LeadRetentionJob).run();
    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await prisma.lead.findUnique({ where: { id: stale.id } })).toBeNull();
    expect(await prisma.lead.findUnique({ where: { id: fresh.id } })).not.toBeNull();
    expect(await prisma.lead.findUnique({ where: { id: hired.id } })).not.toBeNull();
  });
});
