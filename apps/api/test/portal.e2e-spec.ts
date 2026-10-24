import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  addMonthsToCompetence,
  adminCustomerDetailSchema,
  adminMonthPageSchema,
  currentDocumentsCompetence,
  documentsMonthSchema,
  formatBarcodeLine,
  guideParseResultSchema,
  mod11Arrecadacao,
  portalCompanySchema,
  portalGuidesSchema,
  portalHomeSchema,
  portalMeSchema,
  portalPlanSchema,
  todayInSaoPaulo,
  uploadTicketSchema,
} from '@exactra/shared';
import { prisma } from '../src/db.js';
import { sendEmail } from '../src/email.js';
import { PortalJob } from '../src/portal/portal.job.js';
import { PaymentProvider } from '../src/payments/payment-provider.js';
import type { StripeProvider } from '../src/payments/stripe.provider.js';
import { seedAdmin } from '../src/seed-admin.js';
import { createApp } from './app.js';
import { checkoutCompleted, sign } from './stripe-fixtures.js';

vi.mock('../src/email.js', () => ({ sendEmail: vi.fn(async () => {}) }));
const sent = vi.mocked(sendEmail);
const mails = () => sent.mock.calls.map(([e]) => e);

const DAY = 86400_000;
const admin = { email: 'equipe@exactra.test', password: 'senha-forte-123' };
const CNPJ = '12345678000195';

/** Valid 48-digit DAS line (value id 8, mod 11) for the given amount. */
function dasLine(amountCents: number) {
  const body = '818' + String(amountCents).padStart(11, '0') + '03282026123456789012345678901';
  const barcode = body.slice(0, 3) + mod11Arrecadacao(body) + body.slice(3);
  return [0, 1, 2, 3].map((i) => barcode.slice(i * 11, i * 11 + 11)).map((b) => b + mod11Arrecadacao(b)).join('');
}

/** Smallest PDF with one text line per entry (Helvetica), enough for pdf.js to extract. */
function pdfWithText(lines: string[]): Buffer {
  const stream = `BT /F1 10 Tf 40 800 Td 14 TL ${lines.map((l) => `(${l.replace(/[()\\]/g, '')}) '`).join(' ')} ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

describe('customer area (e2e)', () => {
  let app: NestExpressApplication;
  let adminCookie: string;
  let customerCookie: string;
  let customerId: string;
  const http = () => request(app.getHttpServer());

  const signIn = async (email: string, password: string) => {
    const res = await http().post('/api/auth/sign-in/email').send({ email, password }).expect(200);
    return res.headers['set-cookie']![0].split(';')[0];
  };
  const as = (cookie: string) => ({
    get: (p: string) => http().get(p).set('cookie', cookie),
    post: (p: string, body?: object) => http().post(p).set('cookie', cookie).send(body),
    patch: (p: string, body?: object) => http().patch(p).set('cookie', cookie).send(body),
    del: (p: string) => http().delete(p).set('cookie', cookie),
  });
  const tokenFrom = (text: string) => text.match(/\/entrar\/ativar\?token=([\w-]+)/)![1];

  /** Signed PUT to the URL the API returned (local storage in tests), then confirm. */
  async function upload(cookie: string, base: '/app' | '/admin', input: object, body: Buffer) {
    const ticket = uploadTicketSchema.parse((await as(cookie).post(`${base}/uploads`, input).expect(201)).body);
    const path = new URL(ticket.url).pathname;
    await http().put(path).set(ticket.headers).send(body).expect(200);
    return (await as(cookie).post(`${base}/uploads/${ticket.fileId}/complete`).expect(200)).body as { id: string };
  }

  beforeAll(async () => {
    process.env.STORAGE_LOCAL_DIR = `.storage-test-${process.pid}`;
    app = await createApp();
    const stripe = (app.get(PaymentProvider) as StripeProvider).stripe;
    let k = 0;
    vi.spyOn(stripe.checkout.sessions, 'create').mockImplementation(async () => ({ id: `cs_portal_${++k}`, url: 'https://checkout.stripe.com/p' }) as never);
    await seedAdmin(admin.email, admin.password);
    adminCookie = await signIn(admin.email, admin.password);
  });
  afterAll(async () => {
    await app.close();
    const { rm } = await import('node:fs/promises');
    await rm(process.env.STORAGE_LOCAL_DIR!, { recursive: true, force: true });
  });
  beforeEach(() => sent.mockClear());

  it('a paid checkout creates the customer login and the welcome e-mail carries the activation link', async () => {
    const res = await http()
      .post('/checkout/sessions')
      .send({
        plan: 'exactra',
        period: 'ANNUAL',
        method: 'PIX',
        customer: { name: 'Marina Costa', email: 'Marina@Cliente.test', phone: '21988887777', document: '12.345.678/0001-95' },
        consent: true,
      })
      .expect(201);
    const body = JSON.stringify(checkoutCompleted(res.body.contractId, { mode: 'payment', paid: true }));
    await http().post('/webhooks/stripe').set('stripe-signature', sign(body)).set('content-type', 'application/json').send(body).expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'marina@cliente.test' }, include: { memberships: true } });
    expect(user.role).toBe('customer');
    expect(user.emailVerified).toBe(false);
    customerId = user.memberships[0].customerId;
    const welcome = mails().find((m) => m.to === 'Marina@Cliente.test')!;
    expect(welcome.text).toContain('/entrar/ativar?token=');

    const token = tokenFrom(welcome.text);
    const info = await http().get(`/account/invite?token=${token}`).expect(200);
    expect(info.body).toEqual({ email: 'marina@cliente.test', name: 'Marina Costa', companyName: 'Marina Costa' });
    await http().post('/account/activate').send({ token, password: 'minha-senha-1' }).expect(200);
    await http().post('/account/activate').send({ token, password: 'outra-senha-1' }).expect(400);
    await http().get(`/account/invite?token=${token}`).expect(400);

    customerCookie = await signIn('marina@cliente.test', 'minha-senha-1');
    const me = portalMeSchema.parse((await as(customerCookie).get('/app/me').expect(200)).body);
    expect(me).toMatchObject({ company: { id: customerId, document: CNPJ }, access: { level: 'FULL' }, onboarded: false });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);
  });

  it('keeps roles apart: customers never reach /admin, staff never reach /app', async () => {
    await as(customerCookie).get('/admin/month').expect(403);
    await as(customerCookie).get('/admin/contracts').expect(403);
    await as(customerCookie).post('/api/auth/admin/list-users').expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
    await as(adminCookie).get('/app/me').expect(403);
    await http().get('/app/me').expect(401);
  });

  it('magic link goes to customers only', async () => {
    await http().post('/api/auth/sign-in/magic-link').send({ email: 'marina@cliente.test', callbackURL: 'http://localhost:3000/app' }).expect(200);
    await http().post('/api/auth/sign-in/magic-link').send({ email: admin.email, callbackURL: 'http://localhost:3000/app' }).expect(200);
    await http().post('/api/auth/sign-in/magic-link').send({ email: 'ninguem@x.test', callbackURL: 'http://localhost:3000/app' }).expect(200);
    expect(mails().map((m) => m.to)).toEqual(['marina@cliente.test']);
    expect(mails()[0].text).toContain('/magic-link/verify?token=');
  });

  it('onboarding saves the profile and builds the month checklist from it', async () => {
    await as(customerCookie).post('/app/onboarding', { phone: '21988887777', acceptTerms: true, profile: { activity: 'servicos', hasEmployees: false, banks: ['Itaú'] } }).expect(200);
    const docs = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    expect(docs.competence).toBe(currentDocumentsCompetence());
    const titles = docs.requests.map((r) => r.title);
    expect(titles).toContain('Extratos bancários');
    expect(titles).toContain('Notas fiscais de serviço emitidas');
    expect(titles).not.toContain('Notas fiscais de compra');
    expect(titles).not.toContain('Ponto e ocorrências dos funcionários');
  });

  it('uploads go straight to storage, mark the item as sent and download with a signed URL', async () => {
    const docs = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    const extratos = docs.requests.find((r) => r.title === 'Extratos bancários')!;

    await as(customerCookie).post('/app/uploads', { purpose: 'document', requestId: extratos.id, fileName: 'virus.exe', sizeBytes: 10 }).expect(400);
    await as(customerCookie).post('/app/uploads', { purpose: 'guide', fileName: 'a.pdf', sizeBytes: 10, competence: docs.competence }).expect(403);

    const file = await upload(customerCookie, '/app', { purpose: 'document', requestId: extratos.id, fileName: 'Extrato outubro.pdf', sizeBytes: 9 }, Buffer.from('%PDF-1.4 x'));
    const after = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    const item = after.requests.find((r) => r.id === extratos.id)!;
    expect(item.status).toBe('SENT');
    expect(item.files[0]).toMatchObject({ fileName: 'Extrato outubro.pdf', contentType: 'application/pdf', uploadedBy: 'customer', canDelete: true });

    const { url } = (await as(customerCookie).get(`/app/files/${file.id}/download`).expect(200)).body;
    const dl = await http().get(new URL(url).pathname).expect(200);
    expect(dl.headers['content-type']).toContain('application/pdf');
    expect(dl.headers['content-disposition']).toContain('attachment');
    expect(dl.headers['content-disposition']).toContain("filename*=UTF-8''Extrato%20outubro.pdf");

    // Another company never sees it.
    await as(adminCookie).get(`/admin/files/${file.id}/download`).expect(200);
    const other = await prisma.customer.create({ data: { name: 'Outra', email: 'o@x.test', phone: '11999990000', document: '11111111111', consentAt: new Date() } });
    const otherFile = await prisma.storedFile.create({
      data: { customerId: other.id, kind: 'DOCUMENT', storageKey: 'customers/x/y.pdf', fileName: 'y.pdf', contentType: 'application/pdf', sizeBytes: 1, competence: docs.competence, uploadedAt: new Date() },
    });
    await as(customerCookie).get(`/app/files/${otherFile.id}/download`).expect(404);

    // Removing the last file puts the item back to pending.
    await as(customerCookie).del(`/app/files/${file.id}`).expect(204);
    const reverted = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    expect(reverted.requests.find((r) => r.id === extratos.id)!.status).toBe('PENDING');
  });

  it('a rejection reopens the item, e-mails the customer and shows on the home page', async () => {
    const docs = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    const extratos = docs.requests.find((r) => r.title === 'Extratos bancários')!;
    await upload(customerCookie, '/app', { purpose: 'document', requestId: extratos.id, fileName: 'extrato.ofx', sizeBytes: 5 }, Buffer.from('OFX..'));

    await as(adminCookie).post(`/admin/document-requests/${extratos.id}/reject`, { reason: 'incomplete', note: 'Faltou a segunda quinzena' }).expect(200);
    expect(mails()[0].subject).toBe('Precisamos de um novo envio: Extratos bancários');
    const home = portalHomeSchema.parse((await as(customerCookie).get('/app/home').expect(200)).body);
    expect(home.tasks).toContainEqual(expect.objectContaining({ kind: 'rejected', requestId: extratos.id, reason: 'incomplete' }));

    await upload(customerCookie, '/app', { purpose: 'document', requestId: extratos.id, fileName: 'extrato-completo.pdf', sizeBytes: 5 }, Buffer.from('%PDF-'));
    const again = documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body);
    expect(again.requests.find((r) => r.id === extratos.id)).toMatchObject({ status: 'SENT', rejection: null });
  });

  it('guide publishing: the PDF pre-fills the form, a person confirms, the customer pays and reports it', async () => {
    const line = dasLine(41250);
    const due = new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10);
    const [y, m, d] = due.split('-');
    const pdf = pdfWithText([
      'Documento de Arrecadacao do Simples Nacional',
      'CNPJ 12.345.678/0001-95',
      'Periodo de Apuracao 10/2026',
      `Pagar este documento ate ${d}/${m}/${y}`,
      'Valor Total do Documento 412,50',
      formatBarcodeLine(line),
    ]);
    const file = await upload(adminCookie, '/admin', { purpose: 'guide', customerId, fileName: 'DAS-10-2026.pdf', sizeBytes: pdf.length }, pdf);
    const parsed = guideParseResultSchema.parse((await as(adminCookie).post('/admin/guides/parse', { fileId: file.id }).expect(200)).body);
    expect(parsed).toMatchObject({
      hasText: true,
      barcode: line,
      barcodeAmountCents: 41250,
      amountMatchesText: true,
      dueDate: due,
      competence: '2026-10',
      type: 'DAS',
      documentMatches: true,
      warnings: [],
    });

    const guide = { customerId, fileId: file.id, type: 'DAS', competence: '2026-10', amountCents: 41250, dueDate: due, barcode: line };
    await as(adminCookie).post('/admin/guides', { ...guide, amountCents: 41000 }).expect(400);
    const { id } = (await as(adminCookie).post('/admin/guides', guide).expect(201)).body;
    expect(mails()[0].subject).toContain('Nova guia: DAS');
    await as(adminCookie).post('/admin/guides', guide).expect(400); // the same PDF cannot become two guides

    const list = portalGuidesSchema.parse((await as(customerCookie).get('/app/guides').expect(200)).body);
    expect(list.open[0]).toMatchObject({ id, status: 'OPEN', barcode: line, amountCents: 41250 });
    const home = portalHomeSchema.parse((await as(customerCookie).get('/app/home').expect(200)).body);
    expect(home.guides).toMatchObject({ open: 1, openAmountCents: 41250, nextDueDate: due });

    const receipt = await upload(customerCookie, '/app', { purpose: 'receipt', guideId: id, fileName: 'comprovante.jpg', sizeBytes: 3 }, Buffer.from('jpg'));
    await as(customerCookie).post(`/app/guides/${id}/paid`, { receiptFileId: receipt.id }).expect(200);
    // The same receipt cannot be attached to another guide.
    const other = await prisma.taxGuide.create({
      data: { customerId, type: 'ISS', competence: '2026-10', amountCents: 100, dueDate: new Date(due), fileId: (await prisma.storedFile.create({ data: { customerId, kind: 'GUIDE', storageKey: `k-${Date.now()}`, fileName: 'iss.pdf', contentType: 'application/pdf', sizeBytes: 1, competence: '2026-10', uploadedAt: new Date(), byStaff: true } })).id },
    });
    await as(customerCookie).post(`/app/guides/${other.id}/paid`, { receiptFileId: receipt.id }).expect(400);
    const paid = portalGuidesSchema.parse((await as(customerCookie).get('/app/guides').expect(200)).body);
    expect(paid.paid[0]).toMatchObject({ id, status: 'PAID', receipt: { fileName: 'comprovante.jpg' } });
    await as(customerCookie).del(`/app/guides/${id}/paid`).expect(200);
  });

  it('warns when the guide PDF belongs to another company', async () => {
    const pdf = pdfWithText(['DARF', 'CNPJ 99.888.777/0001-66', 'Vencimento 20/12/2026', 'Valor 10,00']);
    const file = await upload(adminCookie, '/admin', { purpose: 'guide', customerId, fileName: 'darf.pdf', sizeBytes: pdf.length }, pdf);
    const parsed = guideParseResultSchema.parse((await as(adminCookie).post('/admin/guides/parse', { fileId: file.id }).expect(200)).body);
    expect(parsed.documentMatches).toBe(false);
    expect(parsed.barcode).toBeNull();
    expect(parsed.warnings.join(' ')).toMatch(/não é o deste cliente/);
  });

  it('month overview and customer file for the team', async () => {
    const page = adminMonthPageSchema.parse((await as(adminCookie).get('/admin/month').expect(200)).body);
    const row = page.items.find((r) => r.customerId === customerId)!;
    expect(row).toMatchObject({ hasLogin: true, onboarded: true, docsRequired: 1, docsSent: 1 });
    expect(page.totals.customers).toBeGreaterThanOrEqual(1);

    const detail = adminCustomerDetailSchema.parse((await as(adminCookie).get(`/admin/customers/${customerId}`).expect(200)).body);
    expect(detail.members[0]).toMatchObject({ email: 'marina@cliente.test', activated: true });
    const folha = detail.checklist.find((i) => i.title.startsWith('Ponto'))!;
    expect(folha.applies).toBe(false);

    // Extra item just for this company, then turn a template off.
    await as(adminCookie).post('/admin/checklist-items', { title: 'Contrato de aluguel novo', required: true, appliesTo: {}, customerId }).expect(201);
    const despesas = detail.checklist.find((i) => i.title === 'Comprovantes de despesas')!;
    const patched = adminCustomerDetailSchema.parse((await as(adminCookie).patch(`/admin/customers/${customerId}`, { disabledItemIds: [despesas.id], remindersEnabled: false }).expect(200)).body);
    expect(patched.remindersEnabled).toBe(false);
    expect(patched.checklist.find((i) => i.id === despesas.id)!.disabled).toBe(true);
    await as(adminCookie).patch(`/admin/customers/${customerId}`, { remindersEnabled: true }).expect(200);
  });

  it('checklist items start now, in a later month, or never in the past', async () => {
    const current = currentDocumentsCompetence();
    const titles = async () => documentsMonthSchema.parse((await as(customerCookie).get('/app/documents').expect(200)).body).requests.map((r) => r.title);
    const post = (title: string, startsCompetence?: string) =>
      as(adminCookie).post('/admin/checklist-items', { title, required: false, appliesTo: {}, customerId, ...(startsCompetence ? { startsCompetence } : {}) });

    await post('Item de mês que passou', addMonthsToCompetence(current, -1)).expect(400);
    const later = (await post('Item do próximo mês').expect(201)).body;
    expect(later.startsCompetence).toBe(addMonthsToCompetence(current, 1));
    await post('Item de agora', current).expect(201);
    expect(await titles()).toContain('Item de agora');
    expect(await titles()).not.toContain('Item do próximo mês');

    // Moving a later item to the open month adds it right away.
    await as(adminCookie).patch(`/admin/checklist-items/${later.id}`, { startsCompetence: current }).expect(200);
    expect(await titles()).toContain('Item do próximo mês');
    await as(adminCookie).patch(`/admin/checklist-items/${later.id}`, { startsCompetence: addMonthsToCompetence(current, -2) }).expect(400);
  });

  it('manual customers get a login and an invite; resending refuses an activated account', async () => {
    const today = todayInSaoPaulo();
    const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    const { id } = (
      await as(adminCookie).post('/admin/customers', { name: 'Padaria Sol', email: 'dono@padaria.test', phone: '11955554444', document: '98.765.432/0001-98', startsAt: today, endsAt: nextYear }).expect(201)
    ).body;
    expect(mails()[0]).toMatchObject({ to: 'dono@padaria.test', subject: 'Ative seu acesso à área do cliente da Exactra' });
    const c = await prisma.customer.findUniqueOrThrow({ where: { id }, include: { contracts: true } });
    expect(c.contracts[0]).toMatchObject({ source: 'MANUAL', status: 'ACTIVE', stripeSessionId: null });

    await as(adminCookie).post(`/admin/customers/${id}/invite`).expect(200);
    const token = tokenFrom(mails().at(-1)!.text);
    await http().post('/account/activate').send({ token, password: 'padaria-123' }).expect(200);
    await as(adminCookie).post(`/admin/customers/${id}/invite`).expect(409);
    await as(adminCookie).post('/admin/customers', { name: 'Outra Sol', email: 'x@padaria.test', phone: '11955554444', document: '98765432000198', startsAt: today, endsAt: nextYear }).expect(409);

    const padaria = await signIn('dono@padaria.test', 'padaria-123');
    const company = portalCompanySchema.parse((await as(padaria).get('/app/company').expect(200)).body);
    expect(company).toMatchObject({ name: 'Padaria Sol', members: [{ email: 'dono@padaria.test', role: 'OWNER', you: true }] });
  });

  it('plan: renewal opens near the end and starts when the current contract ends', async () => {
    let plan = portalPlanSchema.parse((await as(customerCookie).get('/app/plan').expect(200)).body);
    expect(plan.canRenew).toBe(false);
    await as(customerCookie).post('/app/plan/renew', { method: 'PIX', consent: true }).expect(400);

    const current = await prisma.contract.findFirstOrThrow({ where: { customerId, status: 'ACTIVE' } });
    const endsAt = new Date(Date.now() + 20 * DAY);
    await prisma.contract.update({ where: { id: current.id }, data: { endsAt } });
    plan = portalPlanSchema.parse((await as(customerCookie).get('/app/plan').expect(200)).body);
    expect(plan.canRenew).toBe(true);

    const renew = await as(customerCookie).post('/app/plan/renew', { method: 'PIX', consent: true }).expect(201);
    // A second renewal while the first one waits for payment would charge (and add) another year.
    await as(customerCookie).post('/app/plan/renew', { method: 'CARD', consent: true }).expect(409);
    const body = JSON.stringify(checkoutCompleted(renew.body.contractId, { mode: 'payment', paid: true }));
    await http().post('/webhooks/stripe').set('stripe-signature', sign(body)).set('content-type', 'application/json').send(body).expect(200);
    const renewed = await prisma.contract.findUniqueOrThrow({ where: { id: renew.body.contractId } });
    expect(renewed).toMatchObject({ customerId, status: 'ACTIVE' });
    expect(renewed.startsAt!.getTime()).toBe(endsAt.getTime());
    // Same login, no new invite.
    expect(mails().some((m) => m.text.includes('/entrar/ativar'))).toBe(false);
    expect(mails().map((m) => m.subject)).toEqual(expect.arrayContaining([
      expect.stringContaining('Renovação confirmada'),
    ]));
  });

  it('read-only after the end: history stays, writing is refused', async () => {
    await prisma.contract.updateMany({ where: { customerId }, data: { status: 'EXPIRED', endsAt: new Date(Date.now() - 5 * DAY) } });
    const me = portalMeSchema.parse((await as(customerCookie).get('/app/me').expect(200)).body);
    expect(me.access.level).toBe('READ_ONLY');
    await as(customerCookie).get('/app/guides').expect(200);
    await as(customerCookie).post('/app/uploads', { purpose: 'document', fileName: 'a.pdf', sizeBytes: 1, competence: currentDocumentsCompetence() }).expect(403);
    expect(portalPlanSchema.parse((await as(customerCookie).get('/app/plan').expect(200)).body).canRenew).toBe(true);

    await prisma.contract.updateMany({ where: { customerId }, data: { endsAt: new Date(Date.now() - 200 * DAY) } });
    await as(customerCookie).get('/app/guides').expect(403);
    await as(customerCookie).get('/app/plan').expect(200);
    await prisma.contract.updateMany({ where: { customerId }, data: { status: 'ACTIVE', endsAt: new Date(Date.now() + 300 * DAY) } });
  });

  it('daily job: announces the month once, reminds on the configured days and never repeats', async () => {
    // Next month, day 2 and day 10 (the due day) in São Paulo.
    const t = todayInSaoPaulo();
    const [y, mo] = t.split('-').map(Number);
    const at = (day: number) => new Date(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, day, 15));
    const competence = currentDocumentsCompetence(at(2));
    const job = app.get(PortalJob);

    await job.run(at(2));
    // Marina and the manual customer (Padaria), one e-mail each.
    expect(mails().filter((m) => m.subject.startsWith('Documentos de')).map((m) => m.to).sort()).toEqual(['dono@padaria.test', 'marina@cliente.test']);
    expect(await prisma.documentRequest.count({ where: { customerId, competence } })).toBeGreaterThan(0);
    sent.mockClear();
    await job.run(at(2));
    expect(mails()).toHaveLength(0);

    await job.run(at(10));
    const reminders = mails().filter((m) => m.subject.startsWith('Falta'));
    expect(reminders.map((m) => m.to)).toContain('marina@cliente.test');
    sent.mockClear();
    await job.run(at(10));
    expect(mails().filter((m) => m.subject.startsWith('Falta'))).toHaveLength(0);
  });

  it('retention: deletes files 12 months after their competence', async () => {
    const old = await prisma.storedFile.create({
      data: { customerId, kind: 'DOCUMENT', storageKey: `customers/${customerId}/2020-01/old.pdf`, fileName: 'old.pdf', contentType: 'application/pdf', sizeBytes: 1, competence: '2020-01', uploadedAt: new Date() },
    });
    const r = await app.get(PortalJob).retention();
    expect(r.filesDeleted).toBeGreaterThanOrEqual(1);
    expect(await prisma.storedFile.findUnique({ where: { id: old.id } })).toBeNull();
  });

  it('a returning customer who buys again from the site keeps the same company and login', async () => {
    const res = await http()
      .post('/checkout/sessions')
      .send({
        plan: 'exactra',
        period: 'ANNUAL',
        method: 'BOLETO',
        customer: { name: 'Marina Costa', email: 'marina@cliente.test', phone: '21988887777', document: '12.345.678/0001-95' },
        consent: true,
      })
      .expect(201);
    const contract = await prisma.contract.findUniqueOrThrow({ where: { id: res.body.contractId } });
    expect(contract.customerId).toBe(customerId);
    expect(await prisma.companyMember.count({ where: { user: { email: 'marina@cliente.test' } } })).toBe(1);
  });
});
