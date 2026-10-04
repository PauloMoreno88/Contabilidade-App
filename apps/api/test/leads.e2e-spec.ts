import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RULES_VERSION } from '@exactra/shared';
import { prisma } from '../src/db.js';
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
    expect(res.body.result.recommendedPlan).toBe('profissional');
    expect(saved.consentAt).toBeInstanceOf(Date);
  });

  it('requires consent', () =>
    request(app.getHttpServer()).post('/leads').send({ ...lead, consent: false }).expect(400));

  it('rejects invalid answers', () =>
    request(app.getHttpServer())
      .post('/leads')
      .send({ ...lead, answers: { ...answers, monthlyRevenue: -1 } })
      .expect(400));
});
