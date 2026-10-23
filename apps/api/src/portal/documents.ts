import {
  checklistAppliesToSchema,
  companyProfileSchema,
  currentDocumentsCompetence,
  documentsDueDate,
  itemApplies,
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

/** Templates (minus the ones turned off) that fit the profile, plus the company's own items. */
export async function checklistFor(customer: Pick<Customer, 'id' | 'profile' | 'disabledItemIds'>): Promise<{ item: ChecklistItem; applies: boolean; disabled: boolean }[]> {
  const items = await prisma.checklistItem.findMany({
    where: { active: true, OR: [{ customerId: null }, { customerId: customer.id }] },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const profile = profileOf(customer);
  return items.map((item) => ({
    item,
    applies: item.customerId !== null || itemApplies(checklistAppliesToSchema.parse(item.appliesTo), profile),
    disabled: customer.disabledItemIds.includes(item.id),
  }));
}

/**
 * Creates the month's checklist for a company. Idempotent (unique customer + competence + item):
 * the daily job and the first page view can both call it. Items already created are not changed.
 */
export async function ensureRequests(
  customer: Pick<Customer, 'id' | 'profile' | 'disabledItemIds'>,
  competence: string,
  opts: { force?: boolean } = {},
): Promise<number> {
  // Page views call this too: once the month exists, one cheap check and done (force = re-check after a profile change).
  if (!opts.force && (await prisma.documentRequest.count({ where: { customerId: customer.id, competence } }))) return 0;
  const due = fromDateOnly(documentsDueDate(competence));
  const items = (await checklistFor(customer)).filter((i) => i.applies && !i.disabled).map((i) => i.item);
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
