import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
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

  it('GET /health is public', () => request(app.getHttpServer()).get('/health').expect(200, { ok: true }));

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
