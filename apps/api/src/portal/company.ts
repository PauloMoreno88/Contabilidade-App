import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { customerAccess, type Access } from '@exactra/shared';
import { prisma } from '../db.js';
import type { CompanyMember, Contract, Customer } from '../generated/prisma/client.js';

export type CompanyContext = {
  userId: string;
  member: CompanyMember;
  customer: Customer & { contracts: Contract[] };
  access: Access;
};

/**
 * The company of the signed-in customer. v1 shows one company per login (decision 24):
 * the oldest membership wins; the schema already allows several.
 */
export async function companyFor(session: UserSession): Promise<CompanyContext> {
  const member = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    include: { customer: { include: { contracts: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) throw new NotFoundException('Nenhuma empresa vinculada a este login.');
  const { customer, ...rest } = member;
  return { userId: session.user.id, member: rest, customer, access: customerAccess(customer.contracts) };
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
