import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { auth } from '../src/auth.js';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));

describe('admin bulk email', () => {
  let app: NestExpressApplication;
  let adminCookie: string;
  let customerCookie: string;
  let ids: string[];
  const payload = () => ({ customerIds: [ids[0]], subject: 'Aviso', message: '<script>teste</script>\nOlá!' });
  beforeAll(async () => {
    app = await createApp();
    const admin = { email: 'bulk-admin@exactra.test', password: 'senha-forte-123' };
    const customer = { email: 'bulk-customer@exactra.test', password: 'senha-forte-456' };
    await seedAdmin(admin.email, admin.password);
    await auth.api.createUser({ body: { ...customer, name: 'Cliente', role: 'customer' } });
    const login = async (body: typeof admin) => {
      const res = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send(body).expect(200);
      return res.headers['set-cookie']![0].split(';')[0];
    };
    adminCookie = await login(admin);
    customerCookie = await login(customer);
    ids = [];
    for (const name of ['Um', 'Dois']) {
      const c = await prisma.customer.create({ data: { name, email: `${name}@example.com`, document: name, phone: '11955554444', consentAt: new Date() } });
      ids.push(c.id);
    }
    vi.mocked(sendEmail).mockClear();
  });
  afterAll(() => app.close());

  it('rejects anonymous and customer sessions on both routes', async () => {
    for (const cookie of [undefined, customerCookie]) {
      const get = request(app.getHttpServer()).get('/admin/emails/recipients');
      if (cookie) get.set('cookie', cookie);
      expect([401, 403]).toContain((await get).status);
      const post = request(app.getHttpServer()).post('/admin/emails').send(payload());
      if (cookie) post.set('cookie', cookie);
      expect([401, 403]).toContain((await post).status);
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('lists all customers and sends only the selected customer, once, with escaped HTML', async () => {
    const list = await request(app.getHttpServer()).get('/admin/emails/recipients').set('cookie', adminCookie).expect(200);
    expect(list.body.map((c: { id: string }) => c.id)).toEqual(expect.arrayContaining(ids));
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send({ ...payload(), customerIds: [ids[0], ids[0]] }).expect(201);
    expect(res.body).toEqual({ sent: 1, failedCustomerIds: [] });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: 'Um@example.com', text: payload().message, html: expect.stringContaining('&lt;script&gt;') });
  });
  it('validates the whole selection before sending and rejects empty content', async () => {
    vi.mocked(sendEmail).mockClear();
    for (const body of [{ ...payload(), customerIds: [] }, { ...payload(), subject: ' ' }, { ...payload(), message: ' ' }, { ...payload(), subject: 'a\nb' }, { ...payload(), customerIds: [ids[0], 'missing'] }]) {
      await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send(body).expect(400);
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('reports failures without exposing provider errors and continues sending', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('provider secret'));
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send({ ...payload(), customerIds: ids }).expect(201);
    expect(res.body.sent).toBe(1);
    expect(res.body.failedCustomerIds).toHaveLength(1);
  });
});
