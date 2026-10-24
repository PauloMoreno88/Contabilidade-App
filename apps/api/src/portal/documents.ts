import {
  checklistAppliesToSchema,
  companyProfileSchema,
  currentDocumentsCompetence,
  documentsDueDate,
  itemApplies,
  itemStarted,
  retentionDeletionDate,
  type CompanyProfile,
  type DocumentsMonth,
} from '@exactra/shared';
import { prisma } from '../db.js';
import type { ChecklistItem, Customer } from '../generated/prisma/client.js';
import { fromDateOnly, toDocumentRequest, toPortalFile } from './serialize.js';

export const profileOf = (c: Pick<Customer, 'profile'>): CompanyProfile | null => {
  const parsed = companyProfileSchema.safeParse(c.profile);
  return parsed.success ? parsed.data : null;
};

type ChecklistCustomer = Pick<Customer, 'id' | 'profile' | 'disabledItemIds'>;

const itemFits = (item: ChecklistItem, customer: ChecklistCustomer) =>
  item.customerId !== null || itemApplies(checklistAppliesToSchema.parse(item.appliesTo), profileOf(customer));

/**
 * Templates (minus the ones turned off) that fit the profile, plus the company's own items.
 * With a competence, only the items already started in it.
 */
export async function checklistFor(customer: ChecklistCustomer, competence?: string): Promise<{ item: ChecklistItem; applies: boolean; disabled: boolean }[]> {
  const items = await prisma.checklistItem.findMany({
    where: { active: true, OR: [{ customerId: null }, { customerId: customer.id }] },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return items
    .filter((item) => !competence || itemStarted(item.startsCompetence, competence))
    .map((item) => ({ item, applies: itemFits(item, customer), disabled: customer.disabledItemIds.includes(item.id) }));
}

/**
 * "Agora": adds one item to the open competence of the companies whose month already exists
 * (the others get it when their month is created). No e-mail: the month's notice already went out.
 */
export async function addItemToOpenMonth(item: ChecklistItem): Promise<number> {
  const competence = currentDocumentsCompetence();
  if (!item.active || !itemStarted(item.startsCompetence, competence)) return 0;
  const customers = await prisma.customer.findMany({
    where: { ...(item.customerId ? { id: item.customerId } : {}), documentRequests: { some: { competence } } },
    select: { id: true, profile: true, disabledItemIds: true },
  });
  const targets = customers.filter((c) => itemFits(item, c) && !c.disabledItemIds.includes(item.id));
  if (!targets.length) return 0;
  const due = fromDateOnly(documentsDueDate(competence));
  const { count } = await prisma.documentRequest.createMany({
    data: targets.map((c) => ({
      customerId: c.id,
      itemId: item.id,
      competence,
      title: item.title,
      description: item.description,
      required: item.required,
      dueDate: due,
    })),
    skipDuplicates: true,
  });
  return count;
}

/**
 * Creates the month's checklist for a company. Idempotent (unique customer + competence + item):
 * the daily job and the first page view can both call it. Items already created are not changed.
 */
export async function ensureRequests(
  customer: ChecklistCustomer,
  competence: string,
  opts: { force?: boolean } = {},
): Promise<number> {
  // Page views call this too: once the month exists, one cheap check and done (force = re-check after a profile change).
  if (!opts.force && (await prisma.documentRequest.count({ where: { customerId: customer.id, competence } }))) return 0;
  const due = fromDateOnly(documentsDueDate(competence));
  const items = (await checklistFor(customer, competence)).filter((i) => i.applies && !i.disabled).map((i) => i.item);
  if (!items.length) return 0;
  const { count } = await prisma.documentRequest.createMany({
    data: items.map((item) => ({
      customerId: customer.id,
      itemId: item.id,
      competence,
      title: item.title,
      description: item.description,
      required: item.required,
      dueDate: due,
    })),
    skipDuplicates: true,
  });
  return count;
}

/** Competences with requests or files, newest first, always including the current one. */
async function competencesOf(customerId: string, current: string): Promise<string[]> {
  const [reqs, files] = await Promise.all([
    prisma.documentRequest.findMany({ where: { customerId }, select: { competence: true }, distinct: ['competence'] }),
    prisma.storedFile.findMany({ where: { customerId, kind: 'DOCUMENT', uploadedAt: { not: null } }, select: { competence: true }, distinct: ['competence'] }),
  ]);
  return [...new Set([current, ...reqs.map((r) => r.competence), ...files.map((f) => f.competence)])].sort().reverse();
}

/** The documents page of one company and month (customer view, or the admin with writable = false). */
export async function documentsMonth(customer: Customer, competence: string | undefined, opts: { writable: boolean; ensure: boolean }): Promise<DocumentsMonth> {
  const current = currentDocumentsCompetence();
  const month = competence ?? current;
  if (opts.ensure && month === current) await ensureRequests(customer, month);
  const [requests, others, competences] = await Promise.all([
    prisma.documentRequest.findMany({
      where: { customerId: customer.id, competence: month },
      include: { files: { where: { uploadedAt: { not: null } }, orderBy: { uploadedAt: 'asc' } } },
      orderBy: [{ required: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.storedFile.findMany({
      where: { customerId: customer.id, competence: month, kind: 'DOCUMENT', requestId: null, uploadedAt: { not: null } },
      orderBy: { uploadedAt: 'asc' },
    }),
    competencesOf(customer.id, current),
  ]);
  return {
    competence: month,
    dueDate: documentsDueDate(month),
    requests: requests.map((r) => toDocumentRequest(r, opts.writable)),
    others: others.map((f) => toPortalFile(f, opts.writable)),
    competences,
    deletesOn: retentionDeletionDate(month),
  };
}
