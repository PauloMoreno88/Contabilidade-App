import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { customerAccess, type Access, type AccessLevel } from '@exactra/shared';
import { prisma } from '../db.js';
import type { CompanyMember, Contract, Customer } from '../generated/prisma/client.js';

export type CompanyContext = {
  userId: string;
  member: CompanyMember;
  customer: Customer & { contracts: Contract[] };
  access: Access;
};

const RANK: Record<AccessLevel, number> = { FULL: 0, READ_ONLY: 1, PENDING: 2, BLOCKED: 3 };

/**
 * The company of the signed-in customer. v1 shows one company per login (decision 24); when a
 * login has several (a returning customer who bought again from the site gets a new Customer),
 * the one with the best access wins, then the newest.
 */
export async function companyFor(session: UserSession): Promise<CompanyContext> {
  const members = await prisma.companyMember.findMany({
    where: { userId: session.user.id },
    include: { customer: { include: { contracts: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (!members.length) throw new NotFoundException('Nenhuma empresa vinculada a este login.');
  const ranked = members
    .map((m) => ({ m, access: customerAccess(m.customer.contracts) }))
    .sort((a, b) => RANK[a.access.level] - RANK[b.access.level]);
  const { m, access } = ranked[0];
  const { customer, ...member } = m;
  return { userId: session.user.id, member, customer, access };
}

/** Reading needs a current or recently ended contract (READ_ONLY keeps history available). */
export function assertCanRead(ctx: CompanyContext) {
  if (ctx.access.level !== 'FULL' && ctx.access.level !== 'READ_ONLY') {
    throw new ForbiddenException('Seu acesso está suspenso. Renove o plano para voltar a usar a área do cliente.');
  }
}

/** Sending files and marking guides as paid needs an active contract. */
export function assertCanWrite(ctx: CompanyContext) {
  if (ctx.access.level !== 'FULL') {
    throw new ForbiddenException('Seu plano terminou: a área do cliente está só para consulta. Renove para enviar arquivos.');
  }
}
