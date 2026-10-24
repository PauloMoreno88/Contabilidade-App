import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { renderDocumentRejectedEmail, renderGuidePublishedEmail } from '@exactra/emails';
import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import {
  addMonthsToCompetence,
  adminCustomersQuerySchema,
  adminMonthQuerySchema,
  checklistAppliesToSchema,
  competenceSchema,
  createGuideSchema,
  createManualCustomerSchema,
  createUploadSchema,
  currentDocumentsCompetence,
  customerAccess,
  CURRENT_PLAN,
  CONTRACT_PERIOD,
  daysUntil,
  documentsDueDate,
  guideStatus,
  normalizeTaxId,
  parseBarcodeLine,
  rejectDocumentSchema,
  todayInSaoPaulo,
  updateCustomerSchema,
  upsertChecklistItemSchema,
  type AdminCustomerDetail,
  type AdminCustomersPage,
  type AdminGuide,
  type AdminMonthPage,
  type AdminMonthRow,
  type ChecklistItem as ChecklistItemDto,
  type CreateGuideInput,
  type CreateUploadInput,
  type DocumentsMonth,
  type GuideParseResult,
  type RejectDocumentInput,
  type UpdateCustomerInput,
  type UploadTicket,
} from '@exactra/shared';
import { prisma } from '../db.js';
import { Prisma, type ChecklistItem } from '../generated/prisma/client.js';
import { StorageProvider } from '../storage/storage-provider.js';
import { ZodPipe } from '../zod.pipe.js';
import { addItemToOpenMonth, checklistFor, documentsMonth, ensureRequests, profileOf } from './documents.js';
import { extractPdfText, parseGuideText } from './guide-parser.js';
import { isActivated, sendInvite } from './invites.js';
import { portalLink, sendToCompany } from './notify.js';
import { dateOnly, fromDateOnly, toPortalFile, toPortalGuide } from './serialize.js';
import { completeUpload, createUpload, downloadUrl } from './uploads.js';

type MonthQuery = z.output<typeof adminMonthQuerySchema>;
type CustomersQuery = z.output<typeof adminCustomersQuerySchema>;
type UpsertItem = z.output<typeof upsertChecklistItemSchema>;
const patchItemSchema = upsertChecklistItemSchema.partial();

function searchWhere(q?: string): Prisma.CustomerWhereInput {
  if (!q) return {};
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      ...(digits ? [{ document: { contains: digits } }] : []),
    ],
  };
}

const toItem = (i: ChecklistItem): ChecklistItemDto => ({
  id: i.id,
  title: i.title,
  description: i.description,
  required: i.required,
  appliesTo: checklistAppliesToSchema.parse(i.appliesTo),
  active: i.active,
  sortOrder: i.sortOrder,
  customerId: i.customerId,
  startsCompetence: i.startsCompetence,
});

const lastSeen = (members: { lastSeenAt: Date | null }[]) => {
  const t = Math.max(0, ...members.map((m) => m.lastSeenAt?.getTime() ?? 0));
  return t ? new Date(t).toISOString() : null;
};

const memberInclude = { user: { include: { invites: { orderBy: { createdAt: 'desc' }, take: 1 } } } } satisfies Prisma.CompanyMemberInclude;

/** Admin side of the customer area: month overview, customer file, documents, guides and checklist. */
@Roles(['admin'])
@Controller('admin')
export class AdminPortalController {
  constructor(private readonly storage: StorageProvider) {}

  // ---------- Month overview ----------

  @Get('month')
  async month(@Query(new ZodPipe(adminMonthQuerySchema)) f: MonthQuery): Promise<AdminMonthPage> {
    const current = currentDocumentsCompetence();
    const competence = f.competence ?? current;
    const customers = await prisma.customer.findMany({
      where: { ...searchWhere(f.q), contracts: { some: { startsAt: { not: null } } } },
      include: {
        contracts: true,
        members: { include: memberInclude },
        documentRequests: { where: { competence } },
        // This month's guides and the overdue ones only, not the whole history.
        guides: {
          where: { OR: [{ competence }, { paidAt: null, dueDate: { lt: fromDateOnly(todayInSaoPaulo()) } }] },
          select: { competence: true, dueDate: true, paidAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const live = customers.filter((c) => ['FULL', 'READ_ONLY'].includes(customerAccess(c.contracts).level));

    // The month's checklist exists even for companies that never opened the area.
    if (competence === current) {
      const missing = live.filter((c) => !c.documentRequests.length && customerAccess(c.contracts).level === 'FULL');
      for (const c of missing) {
        if (await ensureRequests(c, competence)) c.documentRequests = await prisma.documentRequest.findMany({ where: { customerId: c.id, competence } });
      }
    }

    const late = daysUntil(documentsDueDate(competence)) < 0;
    const rows: (AdminMonthRow & { complete: boolean; isLate: boolean })[] = live.map((c) => {
      const required = c.documentRequests.filter((r) => r.required);
      const sent = required.filter((r) => r.status === 'SENT').length;
      const users = c.members.map((m) => m.user);
      const hasLogin = users.some((u) => u.emailVerified);
      return {
        customerId: c.id,
        name: c.name,
        document: c.document,
        access: customerAccess(c.contracts).level,
        hasLogin,
        invitePending: !hasLogin && users.some((u) => u.invites[0] && !u.invites[0].usedAt && u.invites[0].expiresAt > new Date()),
        onboarded: Boolean(c.onboardedAt),
        docsSent: sent,
        docsRequired: required.length,
        docsRejected: c.documentRequests.filter((r) => r.status === 'REJECTED').length,
        guidesPublished: c.guides.filter((g) => g.competence === competence).length,
        guidesOverdue: c.guides.filter((g) => guideStatus({ paidAt: g.paidAt, dueDate: dateOnly(g.dueDate) }) === 'OVERDUE').length,
        lastSeenAt: lastSeen(c.members),
        complete: sent === required.length,
        isLate: late && sent < required.length,
      };
    });

    const filtered = rows.filter((r) => {
      if (f.filter === 'late') return r.isLate;
      if (f.filter === 'rejected') return r.docsRejected > 0;
      if (f.filter === 'unpaid') return r.guidesOverdue > 0;
      if (f.filter === 'no_access') return !r.hasLogin;
      return true;
    });
    const page = filtered.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
    return {
      competence,
      dueDate: documentsDueDate(competence),
      items: page.map(({ complete: _c, isLate: _l, ...row }) => row),
      total: filtered.length,
      page: f.page,
      pageSize: f.pageSize,
      totals: {
        customers: rows.length,
        complete: rows.filter((r) => r.complete).length,
        late: rows.filter((r) => r.isLate).length,
        rejected: rows.filter((r) => r.docsRejected > 0).length,
        guidesOverdue: rows.filter((r) => r.guidesOverdue > 0).length,
        noAccess: rows.filter((r) => !r.hasLogin).length,
      },
    };
  }

  // ---------- Customers ----------

  @Get('customers')
  async customers(@Query(new ZodPipe(adminCustomersQuerySchema)) f: CustomersQuery): Promise<AdminCustomersPage> {
    const where = { ...searchWhere(f.q), contracts: { some: { OR: [{ startsAt: { not: null } }, { source: 'MANUAL' as const }] } } };
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { contracts: true, members: { include: memberInclude } },
        orderBy: { createdAt: 'desc' },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);
    return {
      items: items.map((c) => {
        const users = c.members.map((m) => m.user);
        const hasLogin = users.some((u) => u.emailVerified);
        const access = customerAccess(c.contracts);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          document: c.document,
          access: access.level,
          hasLogin,
          invitePending: !hasLogin && users.some((u) => u.invites[0] && !u.invites[0].usedAt && u.invites[0].expiresAt > new Date()),
          endsAt: access.endsAt,
          createdAt: c.createdAt.toISOString(),
        };
      }),
      total,
      page: f.page,
      pageSize: f.pageSize,
    };
  }

  @Get('customers/:id')
  async customer(@Param('id') id: string): Promise<AdminCustomerDetail> {
    const c = await prisma.customer.findUnique({
      where: { id },
      include: { contracts: { orderBy: { createdAt: 'desc' } }, members: { include: memberInclude, orderBy: { createdAt: 'asc' } } },
    });
    if (!c) throw new NotFoundException();
    const checklist = await checklistFor(c);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      document: c.document,
      createdAt: c.createdAt.toISOString(),
      onboardedAt: c.onboardedAt?.toISOString() ?? null,
      remindersEnabled: c.remindersEnabled,
      profile: profileOf(c),
      access: customerAccess(c.contracts),
      members: c.members.map((m) => {
        const invite = m.user.invites[0];
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          activated: m.user.emailVerified,
          inviteSentAt: invite?.createdAt.toISOString() ?? null,
          inviteExpiresAt: invite && !invite.usedAt ? invite.expiresAt.toISOString() : null,
          lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
        };
      }),
      contracts: c.contracts
        .filter((k) => k.startsAt || k.status === 'PENDING_PAYMENT')
        .map((k) => ({
          id: k.id,
          plan: k.plan,
          period: k.period,
          method: k.method,
          status: k.status,
          source: k.source,
          amountCents: k.amountCents,
          startsAt: k.startsAt?.toISOString() ?? null,
          endsAt: k.endsAt?.toISOString() ?? null,
        })),
      disabledItemIds: c.disabledItemIds,
      checklist: checklist.map(({ item, applies, disabled }) => ({ ...toItem(item), applies, disabled })),
    };
  }

  /** A customer who pays outside the site: company + MANUAL contract (no Stripe) + login and invite. */
  @Post('customers')
  @HttpCode(201)
  async createCustomer(@Body(new ZodPipe(createManualCustomerSchema)) input: z.output<typeof createManualCustomerSchema>) {
    const document = normalizeTaxId(input.document);
    const duplicate = await prisma.customer.findFirst({ where: { document, contracts: { some: { status: { in: ['ACTIVE', 'PAST_DUE'] } } } } });
    if (duplicate) throw new ConflictException('Já existe um cliente ativo com este CPF/CNPJ.');
    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        document,
        // The customer accepts the terms on first access (onboarding).
        consentAt: new Date(),
        contracts: {
          create: {
            plan: CURRENT_PLAN.id,
            period: CONTRACT_PERIOD,
            method: 'BOLETO',
            source: 'MANUAL',
            amountCents: input.amountCents,
            status: fromDateOnly(input.endsAt) > new Date() ? 'ACTIVE' : 'EXPIRED',
            statusToken: randomBytes(24).toString('base64url'),
            startsAt: fromDateOnly(input.startsAt),
            endsAt: fromDateOnly(input.endsAt),
          },
        },
      },
    });
    if (input.sendInvite) await sendInvite(customer);
    return { id: customer.id };
  }

  @Patch('customers/:id')
  async updateCustomer(@Param('id') id: string, @Body(new ZodPipe(updateCustomerSchema)) input: UpdateCustomerInput) {
    const exists = await prisma.customer.count({ where: { id } });
    if (!exists) throw new NotFoundException();
    await prisma.customer.update({
      where: { id },
      data: {
        remindersEnabled: input.remindersEnabled,
        disabledItemIds: input.disabledItemIds,
        ...(input.profile !== undefined && { profile: input.profile === null ? Prisma.DbNull : input.profile }),
      },
    });
    return this.customer(id);
  }

  @Post('customers/:id/invite')
  @HttpCode(200)
  async invite(@Param('id') id: string) {
    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    const member = await prisma.companyMember.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'asc' } });
    if (member && (await isActivated(member.userId))) throw new ConflictException('Este cliente já ativou o acesso. Para trocar a senha, use "Esqueci minha senha".');
    const sent = await sendInvite(c);
    if (!sent) throw new ConflictException('O e-mail deste cliente pertence a uma conta da equipe. Altere o e-mail do cliente.');
    return { email: sent.email, expiresAt: sent.expiresAt.toISOString() };
  }

  // ---------- Documents ----------

  @Get('customers/:id/documents')
  async documents(@Param('id') id: string, @Query('competence') competence?: string): Promise<DocumentsMonth> {
    if (competence && !competenceSchema.safeParse(competence).success) throw new BadRequestException('Competência inválida.');
    const c = await prisma.customer.findUnique({ where: { id }, include: { contracts: true } });
    if (!c) throw new NotFoundException();
    return documentsMonth(c, competence, { writable: false, ensure: customerAccess(c.contracts).level === 'FULL' });
  }

  @Post('document-requests/:id/reject')
  @HttpCode(200)
  async reject(@Param('id') id: string, @Body(new ZodPipe(rejectDocumentSchema)) input: RejectDocumentInput) {
    const r = await prisma.documentRequest.findUnique({ where: { id }, include: { customer: true } });
    if (!r) throw new NotFoundException();
    await prisma.documentRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: input.reason, rejectionNote: input.note || null, rejectedAt: new Date() },
    });
    await sendToCompany(
      r.customer,
      await renderDocumentRejectedEmail({
        customerName: r.customer.name,
        competence: r.competence,
        title: r.title,
        reason: input.reason,
        note: input.note,
        url: portalLink(`/documentos?competencia=${r.competence}`),
      }),
    ).catch(() => undefined); // the rejection is saved; the customer also sees it on the home page
    return { ok: true };
  }

  @Get('files/:id/download')
  async download(@Param('id') id: string, @Query('inline') inline?: string) {
    const file = await prisma.storedFile.findFirst({ where: { id, uploadedAt: { not: null } } });
    if (!file) throw new NotFoundException();
    return downloadUrl(this.storage, file, inline === '1');
  }

  // ---------- Guides ----------

  @Post('uploads')
  async createUpload(@Session() session: UserSession, @Body(new ZodPipe(createUploadSchema)) input: CreateUploadInput): Promise<UploadTicket> {
    if (input.purpose !== 'guide' || !input.customerId) throw new BadRequestException('A equipe só envia guias (informe o cliente).');
    const exists = await prisma.customer.count({ where: { id: input.customerId } });
    if (!exists) throw new NotFoundException('Cliente não encontrado.');
    return createUpload(this.storage, { ...input, competence: input.competence ?? currentDocumentsCompetence() }, {
      customerId: input.customerId,
      userId: session.user.id,
      byStaff: true,
    });
  }

  @Post('uploads/:id/complete')
  @HttpCode(200)
  async completeUpload(@Param('id') id: string) {
    return toPortalFile(await completeUpload(this.storage, id, null));
  }

  /** Reads the uploaded PDF and suggests the form values. Publishes nothing. */
  @Post('guides/parse')
  @HttpCode(200)
  async parse(@Body() body: { fileId?: string }): Promise<GuideParseResult> {
    const file = await prisma.storedFile.findFirst({ where: { id: body?.fileId ?? '', kind: 'GUIDE', uploadedAt: { not: null } }, include: { customer: true } });
    if (!file) throw new NotFoundException('Envie o PDF da guia primeiro.');
    const text = await extractPdfText(await this.storage.get(file.storageKey));
    return parseGuideText(text, file.customer.document);
  }

  @Post('guides')
  @HttpCode(201)
  async createGuide(@Session() session: UserSession, @Body(new ZodPipe(createGuideSchema)) input: CreateGuideInput) {
    const file = await prisma.storedFile.findFirst({
      where: { id: input.fileId, customerId: input.customerId, kind: 'GUIDE', uploadedAt: { not: null }, guide: null },
      include: { customer: true },
    });
    if (!file) throw new BadRequestException('PDF da guia não encontrado para este cliente.');
    const guide = await prisma.$transaction(async (tx) => {
      // The file follows the guide's competence (retention counts from it).
      await tx.storedFile.update({ where: { id: file.id }, data: { competence: input.competence } });
      return tx.taxGuide.create({
        data: {
          customerId: input.customerId,
          type: input.type,
          label: input.label || null,
          competence: input.competence,
          amountCents: input.amountCents,
          dueDate: fromDateOnly(input.dueDate),
          barcode: input.barcode ? parseBarcodeLine(input.barcode)!.line : null,
          fileId: file.id,
          publishedById: session.user.id,
        },
      });
    });
    await sendToCompany(
      file.customer,
      await renderGuidePublishedEmail({
        customerName: file.customer.name,
        guide: { type: guide.type, label: guide.label, competence: guide.competence, amountCents: guide.amountCents, dueDate: input.dueDate },
        url: portalLink(`/guias?id=${guide.id}`),
      }),
    ).catch(() => undefined); // published anyway; the daily reminders cover a missed e-mail
    return { id: guide.id };
  }

  @Get('customers/:id/guides')
  async guides(@Param('id') id: string): Promise<AdminGuide[]> {
    const guides = await prisma.taxGuide.findMany({ where: { customerId: id }, include: { file: true, receipt: true }, orderBy: { dueDate: 'desc' } });
    const staff = await prisma.user.findMany({ where: { id: { in: guides.map((g) => g.publishedById).filter((x): x is string => Boolean(x)) } } });
    return guides.map((g) => ({ ...toPortalGuide(g), publishedBy: staff.find((u) => u.id === g.publishedById)?.name ?? null }));
  }

  /** Removes a guide published by mistake (and its PDF). */
  @Delete('guides/:id')
  @HttpCode(204)
  async deleteGuide(@Param('id') id: string) {
    const g = await prisma.taxGuide.findUnique({ where: { id }, include: { file: true, receipt: true } });
    if (!g) throw new NotFoundException();
    await prisma.$transaction([
      prisma.taxGuide.delete({ where: { id } }),
      prisma.storedFile.deleteMany({ where: { id: { in: [g.fileId, ...(g.receiptFileId ? [g.receiptFileId] : [])] } } }),
    ]);
    for (const f of [g.file, g.receipt]) if (f) await this.storage.delete(f.storageKey).catch(() => undefined);
  }

  // ---------- Checklist ----------

  @Get('checklist-items')
  async items(@Query('customerId') customerId?: string): Promise<ChecklistItemDto[]> {
    const items = await prisma.checklistItem.findMany({ where: { customerId: customerId ?? null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return items.map(toItem);
  }

  @Post('checklist-items')
  @HttpCode(201)
  async createItem(@Body(new ZodPipe(upsertChecklistItemSchema)) input: UpsertItem): Promise<ChecklistItemDto> {
    if (input.customerId && !(await prisma.customer.count({ where: { id: input.customerId } }))) throw new NotFoundException('Cliente não encontrado.');
    const current = currentDocumentsCompetence();
    const startsCompetence = input.startsCompetence ?? addMonthsToCompetence(current, 1);
    if (startsCompetence < current) throw new BadRequestException('O item não pode começar num mês que já passou.');
    const item = await prisma.checklistItem.create({ data: { ...input, description: input.description ?? null, customerId: input.customerId ?? null, startsCompetence } });
    await addItemToOpenMonth(item);
    return toItem(item);
  }

  /**
   * Text changes apply from the next month's checklist; requests already created keep their text.
   * Moving the start to the open competence adds the item to it now.
   */
  @Patch('checklist-items/:id')
  async updateItem(@Param('id') id: string, @Body(new ZodPipe(patchItemSchema)) input: Partial<UpsertItem>): Promise<ChecklistItemDto> {
    const { customerId: _ignored, ...data } = input;
    const before = await prisma.checklistItem.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    const moved = data.startsCompetence !== undefined && data.startsCompetence !== before.startsCompetence;
    if (moved && data.startsCompetence! < currentDocumentsCompetence()) throw new BadRequestException('O item não pode começar num mês que já passou.');
    const item = await prisma.checklistItem.update({ where: { id }, data });
    if (moved) await addItemToOpenMonth(item);
    return toItem(item);
  }
}
