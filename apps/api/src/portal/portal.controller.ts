import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { Zip, ZipPassThrough } from 'fflate';
import { randomBytes } from 'node:crypto';
import {
  canRenew,
  CONTRACT_PERIOD,
  competenceSchema,
  createUploadSchema,
  currentDocumentsCompetence,
  CURRENT_PLAN,
  daysUntil,
  documentsDueDate,
  markGuidePaidSchema,
  onboardingInputSchema,
  PORTAL_RULES,
  renewInputSchema,
  retentionDeletionDate,
  totalPriceCents,
  updateCompanySchema,
  type CreateUploadInput,
  type DocumentsMonth,
  type MarkGuidePaidInput,
  type OnboardingInput,
  type PortalCompany,
  type PortalFile,
  type PortalGuides,
  type PortalHome,
  type PortalMe,
  type PortalPlan,
  type PortalTask,
  type RejectionReason,
  type RenewInput,
  type UpdateCompanyInput,
  type UploadTicket,
} from '@exactra/shared';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaymentProvider } from '../payments/payment-provider.js';
import { StorageProvider } from '../storage/storage-provider.js';
import { webOrigin } from '../web-origin.js';
import { ZodPipe } from '../zod.pipe.js';
import { assertCanRead, assertCanWrite, companyFor, type CompanyContext } from './company.js';
import { documentsMonth, ensureRequests, profileOf } from './documents.js';
import { canDeleteFile, dateOnly, toPortalFile, toPortalGuide } from './serialize.js';
import { completeUpload, createUpload, deleteFile, downloadUrl } from './uploads.js';
import { CUSTOMER_ROLE } from './invites.js';

const guideInclude = { file: true, receipt: true } satisfies Prisma.TaxGuideInclude;
const LAST_SEEN_THROTTLE_MS = 60 * 60_000;

/** Customer area. Every route resolves the signed-in user's company; staff use /admin. */
@Roles([CUSTOMER_ROLE])
@Controller('app')
export class PortalController {
  constructor(
    private readonly storage: StorageProvider,
    private readonly payments: PaymentProvider,
  ) {}

  @Get('me')
  async me(@Session() session: UserSession): Promise<PortalMe> {
    const user = { id: session.user.id, name: session.user.name, email: session.user.email, twoFactorEnabled: Boolean((session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled) };
    const member = await prisma.companyMember.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } });
    if (!member) return { user, company: null, access: { level: 'BLOCKED', endsAt: null, readOnlyUntil: null }, onboarded: false };
    const ctx = await companyFor(session);
    if (!member.lastSeenAt || Date.now() - member.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
      await prisma.companyMember.update({ where: { id: member.id }, data: { lastSeenAt: new Date() } });
    }
    const c = ctx.customer;
    return {
      user,
      company: { id: c.id, name: c.name, document: c.document, email: c.email, phone: c.phone },
      access: ctx.access,
      onboarded: Boolean(c.onboardedAt),
    };
  }

  @Post('onboarding')
  @HttpCode(200)
  async onboarding(@Session() session: UserSession, @Body(new ZodPipe(onboardingInputSchema)) input: OnboardingInput) {
    const ctx = await companyFor(session);
    const customer = await prisma.customer.update({
      where: { id: ctx.customer.id },
      data: {
        phone: input.phone,
        ...(input.profile && { profile: input.profile }),
        onboardedAt: ctx.customer.onboardedAt ?? new Date(),
        consentAt: new Date(),
      },
    });
    if (ctx.access.level === 'FULL') await ensureRequests(customer, currentDocumentsCompetence());
    return { ok: true };
  }

  @Get('home')
  async home(@Session() session: UserSession): Promise<PortalHome> {
    const ctx = await companyFor(session);
    assertCanRead(ctx);
    const c = ctx.customer;
    const competence = currentDocumentsCompetence();
    if (ctx.access.level === 'FULL') await ensureRequests(c, competence);
    const [requests, openGuides, rejected, recent, oldestFile] = await Promise.all([
      prisma.documentRequest.findMany({ where: { customerId: c.id, competence } }),
      prisma.taxGuide.findMany({ where: { customerId: c.id, paidAt: null }, orderBy: { dueDate: 'asc' } }),
      prisma.documentRequest.findMany({ where: { customerId: c.id, status: 'REJECTED' }, orderBy: { rejectedAt: 'desc' }, take: 5 }),
      prisma.taxGuide.findMany({ where: { customerId: c.id }, include: guideInclude, orderBy: { publishedAt: 'desc' }, take: 3 }),
      prisma.storedFile.findFirst({ where: { customerId: c.id, uploadedAt: { not: null } }, orderBy: { competence: 'asc' }, select: { competence: true } }),
    ]);

    const required = requests.filter((r) => r.required);
    const pending = required.filter((r) => r.status !== 'SENT');
    const dueDate = documentsDueDate(competence);
    // Lower = more urgent.
    const ranked: [number, PortalTask][] = [];
    if (!c.onboardedAt) ranked.push([0, { kind: 'onboarding' }]);
    for (const g of openGuides) {
      const due = dateOnly(g.dueDate);
      const days = daysUntil(due);
      ranked.push([days < 0 ? 1 : days <= 3 ? 3 : 6 + days / 100, {
        kind: 'guide', guideId: g.id, type: g.type, label: g.label, amountCents: g.amountCents, dueDate: due, status: days < 0 ? 'OVERDUE' : 'OPEN',
      }]);
    }
    for (const r of rejected) {
      ranked.push([2, { kind: 'rejected', requestId: r.id, competence: r.competence, title: r.title, reason: (r.rejectionReason ?? 'other') as RejectionReason }]);
    }
    if (pending.length && ctx.access.level === 'FULL') {
      ranked.push([daysUntil(dueDate) <= 3 ? 3.5 : 5, { kind: 'documents', competence, pending: pending.length, total: required.length, dueDate }]);
    }
    if (canRenew(ctx.access)) ranked.push([4, { kind: 'renew', endsAt: ctx.access.endsAt }]);
    if (oldestFile) {
      const deletesOn = retentionDeletionDate(oldestFile.competence);
      if (daysUntil(deletesOn) <= PORTAL_RULES.retentionNoticeDays) ranked.push([8, { kind: 'retention', competence: oldestFile.competence, deletesOn }]);
    }

    return {
      tasks: ranked.sort((a, b) => a[0] - b[0]).map(([, t]) => t),
      documents: { competence, sent: required.length - pending.length, total: required.length, dueDate },
      guides: {
        open: openGuides.length,
        openAmountCents: openGuides.reduce((s, g) => s + g.amountCents, 0),
        nextDueDate: openGuides[0] ? dateOnly(openGuides[0].dueDate) : null,
      },
      recentGuides: recent.map((g) => toPortalGuide(g)),
    };
  }

  // ---------- Documents ----------

  @Get('documents')
  async documents(@Session() session: UserSession, @Query('competence') competence?: string): Promise<DocumentsMonth> {
    const ctx = await companyFor(session);
    assertCanRead(ctx);
    if (competence && !competenceSchema.safeParse(competence).success) throw new BadRequestException('Competência inválida.');
    return documentsMonth(ctx.customer, competence, { writable: ctx.access.level === 'FULL', ensure: ctx.access.level === 'FULL' });
  }

  @Post('uploads')
  async createUpload(@Session() session: UserSession, @Body(new ZodPipe(createUploadSchema)) input: CreateUploadInput): Promise<UploadTicket> {
    const ctx = await companyFor(session);
    assertCanWrite(ctx);
    if (input.purpose === 'guide') throw new ForbiddenException();
    return createUpload(this.storage, input, { customerId: ctx.customer.id, userId: ctx.userId, byStaff: false });
  }

  @Post('uploads/:id/complete')
  @HttpCode(200)
  async completeUpload(@Session() session: UserSession, @Param('id') id: string): Promise<PortalFile> {
    const ctx = await companyFor(session);
    assertCanWrite(ctx);
    return toPortalFile(await completeUpload(this.storage, id, ctx.customer.id), true);
  }

  @Delete('files/:id')
  @HttpCode(204)
  async deleteFile(@Session() session: UserSession, @Param('id') id: string) {
    const ctx = await companyFor(session);
    const file = await this.ownFile(ctx, id);
    if (!canDeleteFile(file, ctx.access.level === 'FULL')) throw new ForbiddenException('Este arquivo não pode mais ser removido.');
    if (file.kind === 'RECEIPT') await prisma.taxGuide.updateMany({ where: { receiptFileId: file.id }, data: { receiptFileId: null } });
    await deleteFile(this.storage, file);
  }

  @Get('files/:id/download')
  async download(@Session() session: UserSession, @Param('id') id: string, @Query('inline') inline?: string) {
    const ctx = await companyFor(session);
    assertCanRead(ctx);
    return downloadUrl(this.storage, await this.ownFile(ctx, id), inline === '1');
  }

  /** Every file of one competence in a ZIP (retention notice: "Baixar tudo"). */
  @Get('files.zip')
  async zip(@Session() session: UserSession, @Query('competence') competence: string, @Res() res: Response) {
    const ctx = await companyFor(session);
    assertCanRead(ctx);
    if (!competenceSchema.safeParse(competence).success) throw new BadRequestException('Competência inválida.');
    if (!this.storage.configured) throw new ServiceUnavailableException('Download indisponível no momento.');
    const files = await prisma.storedFile.findMany({ where: { customerId: ctx.customer.id, competence, uploadedAt: { not: null } }, orderBy: { uploadedAt: 'asc' } });
    if (!files.length) throw new NotFoundException('Nada para baixar nesta competência.');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="exactra-${competence}.zip"`);
    const zip = new Zip((err, chunk, final) => {
      if (err) return res.destroy(err);
      res.write(chunk);
      if (final) res.end();
    });
    const folder = { DOCUMENT: 'documentos', GUIDE: 'guias', RECEIPT: 'comprovantes' } as const;
    const used = new Set<string>();
    for (const f of files) {
      let name = `${folder[f.kind]}/${f.fileName.replace(/[/\\]/g, '_')}`;
      for (let i = 2; used.has(name); i++) name = name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
      used.add(name);
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      entry.push(await this.storage.get(f.storageKey), true);
    }
    zip.end();
  }

  private async ownFile(ctx: CompanyContext, id: string) {
    const file = await prisma.storedFile.findFirst({ where: { id, customerId: ctx.customer.id, uploadedAt: { not: null } } });
    if (!file) throw new NotFoundException('Arquivo não encontrado.');
    return file;
  }

  // ---------- Guides ----------

  @Get('guides')
  async guides(@Session() session: UserSession): Promise<PortalGuides> {
    const ctx = await companyFor(session);
    assertCanRead(ctx);
    const guides = await prisma.taxGuide.findMany({ where: { customerId: ctx.customer.id }, include: guideInclude, orderBy: { dueDate: 'asc' } });
    const all = guides.map((g) => toPortalGuide(g));
    return { open: all.filter((g) => g.status !== 'PAID'), paid: all.filter((g) => g.status === 'PAID').reverse() };
  }

  @Post('guides/:id/paid')
  @HttpCode(200)
  async markPaid(@Session() session: UserSession, @Param('id') id: string, @Body(new ZodPipe(markGuidePaidSchema)) input: MarkGuidePaidInput) {
    const ctx = await companyFor(session);
    assertCanWrite(ctx);
    const guide = await prisma.taxGuide.findFirst({ where: { id, customerId: ctx.customer.id } });
    if (!guide) throw new NotFoundException('Guia não encontrada.');
    if (input.receiptFileId) {
      const receipt = await prisma.storedFile.findFirst({
        where: { id: input.receiptFileId, customerId: ctx.customer.id, kind: 'RECEIPT', uploadedAt: { not: null } },
      });
      if (!receipt) throw new BadRequestException('Comprovante não encontrado.');
    }
    const updated = await prisma.taxGuide.update({
      where: { id: guide.id },
      data: { paidAt: guide.paidAt ?? new Date(), ...(input.receiptFileId && { receiptFileId: input.receiptFileId }) },
      include: guideInclude,
    });
    return toPortalGuide(updated);
  }

  /** "Desfazer": the customer marked the wrong guide. */
  @Delete('guides/:id/paid')
  async unmarkPaid(@Session() session: UserSession, @Param('id') id: string) {
    const ctx = await companyFor(session);
    assertCanWrite(ctx);
    const { count } = await prisma.taxGuide.updateMany({ where: { id, customerId: ctx.customer.id }, data: { paidAt: null } });
    if (!count) throw new NotFoundException('Guia não encontrada.');
    return toPortalGuide(await prisma.taxGuide.findUniqueOrThrow({ where: { id }, include: guideInclude }));
  }

  // ---------- Plan ----------

  @Get('plan')
  async plan(@Session() session: UserSession): Promise<PortalPlan> {
    const ctx = await companyFor(session);
    const contracts = await prisma.contract.findMany({
      where: { customerId: ctx.customer.id, OR: [{ startsAt: { not: null } }, { status: 'PENDING_PAYMENT' }] },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ startsAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
    });
    return {
      access: ctx.access,
      canRenew: canRenew(ctx.access),
      contracts: contracts.map((c) => ({
        id: c.id,
        plan: c.plan,
        period: c.period,
        method: c.method,
        amountCents: c.amountCents,
        status: c.status,
        source: c.source,
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        payments: c.payments.map((p) => ({
          id: p.id,
          amountCents: p.amountCents,
          method: p.method,
          status: p.status,
          paidAt: p.paidAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
      })),
    };
  }

  /** New one-year contract for the same company. It starts when the current one ends (contract-lifecycle.ts). */
  @Post('plan/renew')
  async renew(@Session() session: UserSession, @Body(new ZodPipe(renewInputSchema)) input: RenewInput) {
    const ctx = await companyFor(session);
    if (!canRenew(ctx.access)) throw new BadRequestException('A renovação abre perto do fim do contrato.');
    if (!this.payments.configured || (this.payments.liveMode && process.env.CHECKOUT_ENABLED !== 'true')) {
      throw new ServiceUnavailableException('Renovação online indisponível no momento.');
    }
    const c = ctx.customer;
    const contract = await prisma.contract.create({
      data: {
        customerId: c.id,
        plan: CURRENT_PLAN.id,
        period: CONTRACT_PERIOD,
        method: input.method,
        amountCents: totalPriceCents(CURRENT_PLAN.id),
        statusToken: randomBytes(24).toString('base64url'),
      },
    });
    try {
      const session = await this.payments.createCheckout({
        contractId: contract.id,
        plan: contract.plan as typeof CURRENT_PLAN.id,
        period: contract.period,
        method: contract.method,
        amountCents: contract.amountCents,
        customer: { name: c.name, email: c.email },
        successUrl: `${webOrigin()}/checkout/status?contract=${contract.id}&token=${contract.statusToken}`,
        cancelUrl: `${webOrigin()}/app/plano?cancelado=1`,
      });
      await prisma.contract.update({ where: { id: contract.id }, data: { stripeSessionId: session.sessionId } });
      await prisma.customer.update({ where: { id: c.id }, data: { consentAt: new Date() } });
      return { checkoutUrl: session.url, contractId: contract.id, statusToken: contract.statusToken };
    } catch (err) {
      await prisma.contract.delete({ where: { id: contract.id } });
      throw err;
    }
  }

  // ---------- Company ----------

  @Get('company')
  async company(@Session() session: UserSession): Promise<PortalCompany> {
    const ctx = await companyFor(session);
    const c = ctx.customer;
    const members = await prisma.companyMember.findMany({ where: { customerId: c.id }, include: { user: true }, orderBy: { createdAt: 'asc' } });
    return {
      id: c.id,
      name: c.name,
      document: c.document,
      email: c.email,
      phone: c.phone,
      profile: profileOf(c),
      remindersEnabled: c.remindersEnabled,
      members: members.map((m) => ({ name: m.user.name, email: m.user.email, role: m.role, you: m.userId === ctx.userId })),
    };
  }

  @Patch('company')
  async updateCompany(@Session() session: UserSession, @Body(new ZodPipe(updateCompanySchema)) input: UpdateCompanyInput) {
    const ctx = await companyFor(session);
    assertCanWrite(ctx);
    await prisma.customer.update({ where: { id: ctx.customer.id }, data: { phone: input.phone, ...(input.profile && { profile: input.profile }) } });
    return this.company(session);
  }
}
