import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CHECKOUT_LIMIT, LEAD_LIMIT } from '../src/rate-limit.js';
import { createApp } from './app.js';

describe('rate limit on public writes (e2e)', () => {
  let app: NestExpressApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());

  // Guards run before validation, so an empty body still counts and answers 400 under the limit.
  it.each([
    ['/leads', LEAD_LIMIT.limit],
    ['/checkout/sessions', CHECKOUT_LIMIT.limit],
  ])('%s answers 429 after %i requests, per IP', async (path, limit) => {
    for (let i = 0; i < limit; i++) {
      const res = await request(app.getHttpServer()).post(path).set('X-Forwarded-For', '203.0.113.7').send({});
      expect(res.status).toBe(400);
    }
    const blocked = await request(app.getHttpServer()).post(path).set('X-Forwarded-For', '203.0.113.7').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Muitas tentativas/);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

    // Another client is not affected.
    const other = await request(app.getHttpServer()).post(path).set('X-Forwarded-For', '203.0.113.8').send({});
    expect(other.status).toBe(400);
  });
});
