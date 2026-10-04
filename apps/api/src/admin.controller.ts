import { Controller, Get, Header, NotFoundException, Param, Query } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import type { z } from 'zod';
import {
  adminContractDetailSchema,
  adminContractsQuerySchema,
  adminLeadsPageSchema,
  adminLeadsQuerySchema,
  type AdminContractDetail,
  type AdminContractRow,
  type AdminContractsPage,
  type AdminLeadsPage,
  type AdminMetrics,
} from '@exactra/shared';
import { prisma } from './db.js';
import type { Prisma } from './generated/prisma/client.js';
import { ZodPipe } from './zod.pipe.js';

const DAY = 86400_000;

// Parsed (output) types: the shared Admin*Query types are the input side (what the front sends).
type ContractsQuery = z.output<typeof adminContractsQuerySchema>;
type LeadsQuery = z.output<typeof adminLeadsQuerySchema>;

/** Prisma rows → JSON (Dates become ISO strings), then the shared schema strips internal fields. */
const toJson = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> => schema.parse(JSON.parse(JSON.stringify(value)));

function contractsWhere(f: ContractsQuery): Prisma.ContractWhereInput {
  const digits = f.q?.replace(/\D/g, '');
  return {
    status: f.status,
    plan: f.plan,
    method: f.method,
    period: f.period,
    customer: f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: 'insensitive' } },
            { email: { contains: f.q, mode: 'insensitive' } },
            ...(digits ? [{ document: { contains: digits } }, { phone: { contains: digits } }] : []),
          ],
        }
      : undefined,
  };
}

type ContractWithCustomer = Prisma.ContractGetPayload<{ include: { customer: true } }>;
const toRow = (c: ContractWithCustomer): AdminContractRow => ({
  id: c.id,
  customerName: c.customer.name,
  email: c.customer.email,
  phone: c.customer.phone,
  document: c.customer.document,
  plan: c.plan,
  period: c.period,
  method: c.method,
  status: c.status,
  startsAt: c.startsAt?.toISOString() ?? null,
  endsAt: c.endsAt?.toISOString() ?? null,
});

/** Neutralizes spreadsheet formulas (CSV injection) and quotes the value. */
const csvCell = (v: string | number | null) => {
  const s = String(v ?? '');
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

@Roles(['admin'])
@Controller('admin')
export class AdminController {
  @Get('metrics')
  async metrics(): Promise<AdminMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const active = { status: 'ACTIVE' } as const;
    const [activeCustomers, newThisMonth, revenue, pendingPayment, expiringIn30Days, byPlan, byMethod] =
      await Promise.all([
        prisma.customer.count({ where: { contracts: { some: active } } }),
        prisma.contract.count({ where: { startsAt: { gte: monthStart } } }),
        prisma.contract.aggregate({ where: active, _sum: { amountCents: true } }),
        prisma.contract.count({ where: { status: 'PENDING_PAYMENT' } }),
        prisma.contract.count({
          where: { ...active, method: { in: ['PIX', 'BOLETO'] }, endsAt: { lte: new Date(now.getTime() + 30 * DAY) } },
        }),
        prisma.contract.groupBy({ by: ['plan'], where: active, _count: true }),
        prisma.contract.groupBy({ by: ['method'], where: active, _count: true }),
      ]);
    return {
      activeCustomers,
      newThisMonth,
      contractedRevenueCents: revenue._sum.amountCents ?? 0,
      pendingPayment,
      expiringIn30Days,
      byPlan: Object.fromEntries(byPlan.map((g) => [g.plan, g._count])),
      byMethod: Object.fromEntries(byMethod.map((g) => [g.method, g._count])),
    };
  }

  @Get('contracts')
  async contracts(@Query(new ZodPipe(adminContractsQuerySchema)) f: ContractsQuery): Promise<AdminContractsPage> {
    const where = contractsWhere(f);
    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      prisma.contract.count({ where }),
    ]);
    return { items: items.map(toRow), total, page: f.page, pageSize: f.pageSize };
  }

  @Get('contracts.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="contratos.csv"')
  async contractsCsv(@Query(new ZodPipe(adminContractsQuerySchema)) f: ContractsQuery) {
    const rows = await prisma.contract.findMany({
      where: contractsWhere(f),
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    const header = ['Cliente', 'E-mail', 'Telefone', 'CPF/CNPJ', 'Plano', 'Período', 'Pagamento', 'Status', 'Valor (R$)', 'Início', 'Fim'];
    const lines = rows.map((c) =>
      [
        c.customer.name,
        c.customer.email,
        c.customer.phone,
        c.customer.document,
        c.plan,
        c.period,
        c.method,
        c.status,
        (c.amountCents / 100).toFixed(2).replace('.', ','),
        c.startsAt?.toISOString().slice(0, 10) ?? '',
        c.endsAt?.toISOString().slice(0, 10) ?? '',
      ]
        .map(csvCell)
        .join(';'),
    );
    // BOM + ";" so Excel in pt-BR opens it correctly.
    return '﻿' + [header.map(csvCell).join(';'), ...lines].join('\r\n');
  }

  @Get('contracts/:id')
  async contract(@Param('id') id: string): Promise<AdminContractDetail> {
    const c = await prisma.contract.findUnique({
      where: { id },
      include: { customer: { include: { lead: true } }, payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!c) throw new NotFoundException();
    return toJson(adminContractDetailSchema, c);
  }

  @Get('leads')
  async leads(@Query(new ZodPipe(adminLeadsQuerySchema)) f: LeadsQuery): Promise<AdminLeadsPage> {
    const where: Prisma.LeadWhereInput = f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: 'insensitive' } },
            { email: { contains: f.q, mode: 'insensitive' } },
            { whatsapp: { contains: f.q.replace(/\D/g, '') || f.q } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
      prisma.lead.count({ where }),
    ]);
    return toJson(adminLeadsPageSchema, { items, total, page: f.page, pageSize: f.pageSize });
  }
}
