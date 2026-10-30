import request from 'supertest';
import { createHmac, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { auth } from '../src/auth.js';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => randomUUID()) }));

describe('admin bulk email', () => {
  let app: NestExpressApplication;
  let adminCookie: string;
  let customerCookie: string;
  let ids: string[];
  const savedSecret = process.env.RESEND_WEBHOOK_SECRET;
  const secret = Buffer.from('bulk-email-webhook-secret-test').toString('base64');
  const hook = (body: object, valid = true) => {
    const payload = JSON.stringify(body);
    const id = `msg_${randomUUID()}`;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${timestamp}.${payload}`).digest('base64');
    return request(app.getHttpServer()).post('/webhooks/resend').set('Content-Type', 'application/json')
      .set('svix-id', id).set('svix-timestamp', timestamp).set('svix-signature', `v1,${valid ? signature : 'invalid'}`).send(payload);
  };
  const payload = () => ({ customerIds: [ids[0]], subject: 'Aviso', message: '<script>teste</script>\nOlá!' });
  beforeAll(async () => {
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${secret}`;
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
  afterAll(async () => {
    if (savedSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = savedSecret;
    await app.close();
  });

  it('rejects anonymous and customer sessions on both routes', async () => {
    for (const cookie of [undefined, customerCookie]) {
      const get = request(app.getHttpServer()).get('/admin/emails/recipients');
      if (cookie) get.set('cookie', cookie);
      expect([401, 403]).toContain((await get).status);
      const post = request(app.getHttpServer()).post('/admin/emails').send(payload());
      if (cookie) post.set('cookie', cookie);
      expect([401, 403]).toContain((await post).status);
      for (const path of ['/admin/emails', '/admin/emails/missing']) {
        const r = request(app.getHttpServer()).get(path);
        if (cookie) r.set('cookie', cookie);
        expect([401, 403]).toContain((await r).status);
      }
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('lists all customers and sends only the selected customer, once, with escaped HTML', async () => {
    const list = await request(app.getHttpServer()).get('/admin/emails/recipients').set('cookie', adminCookie).expect(200);
    expect(list.body.map((c: { id: string }) => c.id)).toEqual(expect.arrayContaining(ids));
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send({ ...payload(), customerIds: [ids[0], ids[0]] }).expect(201);
    expect(res.body).toEqual({ campaignId: expect.any(String), sent: 1, failedCustomerIds: [] });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: 'Um@example.com', text: payload().message, html: expect.stringContaining('&lt;script&gt;') });
    const detail = await request(app.getHttpServer()).get(`/admin/emails/${res.body.campaignId}`).set('cookie', adminCookie).expect(200);
    expect(detail.body).toMatchObject({ message: payload().message, recipientCount: 1, createdBy: 'bulk-admin@exactra.test', recipients: [{ customerId: ids[0], name: 'Um', email: 'Um@example.com', status: 'SENT' }] });
    await prisma.customer.update({ where: { id: ids[0] }, data: { name: 'Novo nome' } });
    const unchanged = await request(app.getHttpServer()).get(`/admin/emails/${res.body.campaignId}`).set('cookie', adminCookie).expect(200);
    expect(unchanged.body.recipients[0].name).toBe('Um');
    await prisma.customer.update({ where: { id: ids[0] }, data: { name: 'Um' } });
    const listHistory = await request(app.getHttpServer()).get('/admin/emails').set('cookie', adminCookie).expect(200);
    expect(listHistory.body).toMatchObject({ total: 1, items: [{ id: res.body.campaignId, recipientCount: 1 }] });
    expect(listHistory.body.items[0]).not.toHaveProperty('message');
    await request(app.getHttpServer()).get('/admin/emails/missing').set('cookie', adminCookie).expect(404);
    await request(app.getHttpServer()).get('/admin/emails?page=0').set('cookie', adminCookie).expect(400);
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
    const rows = await prisma.emailRecipient.findMany({ where: { campaignId: res.body.campaignId } });
    expect(rows.map((r) => r.status).sort()).toEqual(['FAILED', 'SENT']);
  });

  it('records pending recipients before sending and does not claim delivery in dev without a provider ID', async () => {
    vi.mocked(sendEmail).mockImplementationOnce(async () => {
      expect(await prisma.emailRecipient.count({ where: { status: 'PENDING' } })).toBe(1);
      return undefined;
    });
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send(payload()).expect(201);
    expect(res.body.sent).toBe(0);
    const r = await prisma.emailRecipient.findFirstOrThrow({ where: { campaignId: res.body.campaignId } });
    expect(r.status).toBe('PENDING');
  });

  it('verifies signatures, handles delivery and ignores duplicate and out-of-order events', async () => {
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send(payload()).expect(201);
    const recipient = await prisma.emailRecipient.findFirstOrThrow({ where: { campaignId: res.body.campaignId } });
    const time = Date.now();
    const event = (type: string, offset: number) => ({ type, created_at: new Date(time + offset).toISOString(), data: { email_id: recipient.providerMessageId, tags: { bulk_recipient_id: recipient.id } } });
    await hook(event('email.delivered', 0), false).expect(400);
    expect((await prisma.emailRecipient.findUniqueOrThrow({ where: { id: recipient.id } })).status).toBe('SENT');
    await hook(event('email.delivery_delayed', -1000)).expect(200);
    expect((await prisma.emailRecipient.findUniqueOrThrow({ where: { id: recipient.id } })).status).toBe('PENDING');
    await hook(event('email.delivered', 0)).expect(200);
    const delivered = await prisma.emailRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(delivered.status).toBe('DELIVERED');
    await hook(event('email.delivered', 0)).expect(200);
    await hook(event('email.sent', -1000)).expect(200);
    await hook(event('email.delivery_delayed', 1000)).expect(200);
    await hook(event('email.failed', -500)).expect(200);
    const after = await prisma.emailRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(after.status).toBe('DELIVERED');
    expect(after.updatedAt).toEqual(delivered.updatedAt);
    await hook(event('email.bounced', 2000)).expect(200);
    expect((await prisma.emailRecipient.findUniqueOrThrow({ where: { id: recipient.id } })).status).toBe('FAILED');
  });

  it('correlates a webhook that arrives before the send response is persisted', async () => {
    vi.mocked(sendEmail).mockImplementationOnce(async (email) => {
      const providerId = randomUUID();
      await hook({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: providerId, tags: { bulk_recipient_id: email.tags![0].value } } }).expect(200);
      return providerId;
    });
    const res = await request(app.getHttpServer()).post('/admin/emails').set('cookie', adminCookie).send(payload()).expect(201);
    const r = await prisma.emailRecipient.findFirstOrThrow({ where: { campaignId: res.body.campaignId } });
    expect(r.status).toBe('DELIVERED');
    expect(r.providerMessageId).not.toBeNull();
  });
});
