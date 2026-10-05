import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { prisma } from '../src/db.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';

const admin = { email: 'admin@exactra.test', password: 'senha-forte-123' };

describe('auth (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
    expect(await seedAdmin(admin.email, admin.password)).toBe(true);
  });
  afterAll(() => app.close());

  it('GET /health is public and does not need the database', () =>
    request(app.getHttpServer()).get('/health').expect(200, { ok: true }));

  it('GET /health/db is public and checks the database with SELECT 1', () =>
    request(app.getHttpServer()).get('/health/db').expect(200, { ok: true, db: true }));

  it('GET /health/db answers 503 when the database is down (and /health stays 200)', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));
    await request(app.getHttpServer()).get('/health/db').expect(503);
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('seed is idempotent', async () => {
    expect(await seedAdmin(admin.email, admin.password)).toBe(false);
  });

  it('public sign-up is disabled', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email: 'x@y.com', password: 'qualquer-123', name: 'X' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('seeded admin signs in with role admin', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send(admin).expect(200);
    expect(res.body.user.role).toBe('admin');
    expect(res.headers['set-cookie']?.[0]).toContain('better-auth.session_token');
  });

  it('rejects a wrong password', () =>
    request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ ...admin, password: 'errada-123' }).expect(401));
});
