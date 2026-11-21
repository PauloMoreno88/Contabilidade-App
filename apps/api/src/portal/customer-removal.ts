import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sameCompanyName } from '@exactra/shared';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { StorageProvider } from '../storage/storage-provider.js';

const log = new Logger('CustomerRemoval');

/** Marks the bans made by "Desativar", so "Reativar" never lifts a ban made for another reason. */
export const DEACTIVATION_BAN = 'customer-deactivated';

/**
 * Blocks "Apagar" (docs/specs/remover-cliente.md): a contract paid through the site, or a site checkout
 * still open (the Mercado Pago link or a boleto can still be paid until the daily job cancels it).
 */
export const BLOCKS_DELETE: Prisma.ContractWhereInput = {
  source: 'CHECKOUT',
  OR: [{ startsAt: { not: null } }, { payments: { some: {} } }, { status: 'PENDING_PAYMENT' }],
};

export const canDeleteCustomer = async (customerId: string, db: Prisma.TransactionClient = prisma) =>
  !(await db.contract.count({ where: { customerId, ...BLOCKS_DELETE } }));

/** Customer logins of the company that have no other company left in `otherWhere`. */
async function loginsOnlyHere(customerId: string, otherWhere: Prisma.CustomerWhereInput) {
  const members = await prisma.companyMember.findMany({
    where: { customerId, user: { role: 'customer' } },
    include: { user: { include: { memberships: { where: { customerId: { not: customerId }, customer: otherWhere }, select: { id: true } } } } },
  });
  return members.filter((m) => !m.user.memberships.length).map((m) => m.userId);
}

/**
 * "Desativar": no login (ban + sessions dropped), hidden from lists, no automatic e-mails. Files are kept.
 * Open site checkouts are canceled, so a late payment does not activate a hidden company.
 */
export async function deactivateCustomer(id: string, adminId: string) {
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) throw new NotFoundException();
  if (c.deactivatedAt) return;
  // A person with another active company keeps the login; companyFor() hides this one.
  const userIds = await loginsOnlyHere(id, { deactivatedAt: null });
  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { deactivatedAt: new Date() } }),
    prisma.contract.updateMany({ where: { customerId: id, source: 'CHECKOUT', status: 'PENDING_PAYMENT' }, data: { status: 'CANCELED' } }),
    prisma.user.updateMany({ where: { id: { in: userIds }, OR: [{ banned: false }, { banned: null }] }, data: { banned: true, banReason: DEACTIVATION_BAN, banExpires: null } }),
    prisma.session.deleteMany({ where: { userId: { in: userIds } } }),
  ]);
  log.warn(`Customer ${id} deactivated by ${adminId}`);
}

export async function reactivateCustomer(id: string, adminId: string) {
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) throw new NotFoundException();
  if (!c.deactivatedAt) return;
  const members = await prisma.companyMember.findMany({ where: { customerId: id }, select: { userId: true } });
  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { deactivatedAt: null } }),
    prisma.user.updateMany({ where: { id: { in: members.map((m) => m.userId) }, banReason: DEACTIVATION_BAN }, data: { banned: false, banReason: null, banExpires: null } }),
  ]);
  log.warn(`Customer ${id} reactivated by ${adminId}`);
}

async function deleteObjects(storage: StorageProvider, keys: string[]) {
  for (const key of keys) await storage.delete(key);
}

/**
 * "Apagar": removes the company for good, files in the storage included. Refused when the name typed
 * does not match or a site contract blocks it. Storage first: if it fails, the database is untouched and
 * the admin can try again. The checks run again inside the transaction, and files that showed up in
 * between are removed after it.
 */
export async function deleteCustomer(id: string, confirmName: string, adminId: string, storage: StorageProvider) {
  const c = await prisma.customer.findUnique({ where: { id }, include: { files: { select: { storageKey: true } } } });
  if (!c) throw new NotFoundException();
  if (!sameCompanyName(confirmName, c.name)) throw new BadRequestException('O nome digitado não confere com o nome da empresa.');
  const blocked = () => new ConflictException('Este cliente tem contrato pago ou pagamento em aberto pelo site e não pode ser apagado. Use "Desativar".');
  if (!(await canDeleteCustomer(id))) throw blocked();
  if (c.files.length && !storage.configured) throw new ServiceUnavailableException('O armazenamento de arquivos não está configurado. Nada foi apagado.');

  const removed = new Set(c.files.map((f) => f.storageKey));
  try {
    await deleteObjects(storage, [...removed]);
  } catch (err) {
    log.error(`Storage delete failed for customer ${id}`, err as Error);
    throw new BadGatewayException('Não foi possível apagar os arquivos agora. Nada foi apagado; tente de novo em instantes.');
  }

  const userIds = await loginsOnlyHere(id, {});
  const late = await prisma.$transaction(async (tx) => {
    if (!(await canDeleteCustomer(id, tx))) throw blocked();
    const files = await tx.storedFile.findMany({ where: { customerId: id }, select: { storageKey: true } });
    await tx.payment.deleteMany({ where: { contract: { customerId: id } } });
    await tx.contract.deleteMany({ where: { customerId: id } });
    await tx.emailRecipient.deleteMany({ where: { customerId: id } });
    // Guides point to their files (RESTRICT): removed before the company cascade reaches the files.
    await tx.taxGuide.deleteMany({ where: { customerId: id } });
    await tx.customer.delete({ where: { id } });
    // Checked after the company is gone: a login linked meanwhile to another company is kept.
    await tx.user.deleteMany({ where: { id: { in: userIds }, role: 'customer', memberships: { none: {} } } });
    if (c.leadId) await tx.lead.deleteMany({ where: { id: c.leadId, customers: { none: {} } } });
    return files.map((f) => f.storageKey).filter((k) => !removed.has(k));
  });

  if (late.length) {
    await deleteObjects(storage, late).catch((err: unknown) => log.error(`Storage cleanup failed for deleted customer ${id}: ${late.join(', ')}`, err as Error));
  }
  log.warn(`Customer ${id} deleted by ${adminId}: ${removed.size + late.length} files, ${userIds.length} logins`);
}
