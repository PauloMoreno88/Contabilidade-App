import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  renderDocumentsOpenEmail,
  renderDocumentsReminderEmail,
  renderGuideDueEmail,
  renderRetentionNoticeEmail,
} from '@exactra/emails';
import {
  addMonthsToCompetence,
  currentDocumentsCompetence,
  customerAccess,
  daysUntil,
  documentsDueDate,
  PORTAL_RULES,
  retentionDeletionDate,
  todayInSaoPaulo,
} from '@exactra/shared';
import { prisma } from '../db.js';
import { StorageProvider } from '../storage/storage-provider.js';
import { ensureRequests } from './documents.js';
import { portalLink, sendOnce } from './notify.js';
import { dateOnly } from './serialize.js';

/**
 * Daily customer area job (07:00 São Paulo):
 * 1. creates the month's checklist for every active company and announces it once;
 * 2. reminds pending documents and open guides on the configured days (each e-mail once);
 * 3. warns before files leave the retention window, then deletes them.
 * Every e-mail goes through NotificationLog, so running twice in a day sends nothing new.
 */
@Injectable()
export class PortalJob {
  private readonly log = new Logger(PortalJob.name);

  constructor(private readonly storage: StorageProvider) {}

  // Same in-process cron caveat as ExpiryJob.
  @Cron('0 7 * * *', { timeZone: 'America/Sao_Paulo' })
  async daily() {
    const r = await this.run();
    this.log.log(JSON.stringify(r));
  }

  async run(now = new Date()) {
    const competence = currentDocumentsCompetence(now);
    const dueDate = documentsDueDate(competence);
    const daysToDue = daysUntil(dueDate, now);
    const stats = { opened: 0, docReminders: 0, guideReminders: 0, retentionNotices: 0, filesDeleted: 0 };

    const customers = await prisma.customer.findMany({ include: { contracts: true, members: true } });
    for (const c of customers) {
      if (customerAccess(c.contracts, now).level !== 'FULL' || !c.members.length) continue;

      await ensureRequests(c, competence);
      const requests = await prisma.documentRequest.findMany({ where: { customerId: c.id, competence }, orderBy: { createdAt: 'asc' } });
      const docsUrl = portalLink(`/documentos?competencia=${competence}`);

      if (requests.length && daysToDue > 0) {
        const sent = await sendOnce(c, 'docs-open', competence, () =>
          renderDocumentsOpenEmail({ customerName: c.name, competence, dueDate, items: requests.map((r) => r.title), url: docsUrl }),
        );
        if (sent) stats.opened++;
      }

      if (!c.remindersEnabled) continue;

      const pending = requests.filter((r) => r.required && r.status !== 'SENT');
      if (pending.length && (PORTAL_RULES.documentReminderDaysBefore as readonly number[]).includes(daysToDue)) {
        const sent = await sendOnce(c, 'docs-reminder', `${competence}:${daysToDue}`, () =>
          renderDocumentsReminderEmail({ customerName: c.name, competence, dueDate, items: pending.map((r) => r.title), url: docsUrl, daysLeft: daysToDue }),
        );
        if (sent) stats.docReminders++;
      }

      const guides = await prisma.taxGuide.findMany({ where: { customerId: c.id, paidAt: null } });
      for (const g of guides) {
        const due = dateOnly(g.dueDate);
        const days = daysUntil(due, now);
        if (!(PORTAL_RULES.guideReminderDaysBefore as readonly number[]).includes(days)) continue;
        const sent = await sendOnce(c, 'guide-due', `${g.id}:${days}`, () =>
          renderGuideDueEmail({
            customerName: c.name,
            guide: { type: g.type, label: g.label, competence: g.competence, amountCents: g.amountCents, dueDate: due },
            url: portalLink(`/guias?id=${g.id}`),
            daysLeft: days,
          }),
        );
        if (sent) stats.guideReminders++;
      }
    }

    Object.assign(stats, await this.retention(now));
    return stats;
  }

  /**
   * Files are kept for PORTAL_RULES.retentionMonths after their competence (user decision, 23/10/2026).
   * Companies are warned retentionNoticeDays before; uploads never confirmed are removed after a day.
   */
  async retention(now = new Date()) {
    const today = todayInSaoPaulo(now);
    let retentionNotices = 0;
    let filesDeleted = 0;

    // The competence whose deletion date falls inside the notice window.
    const noticeDay = todayInSaoPaulo(new Date(now.getTime() + PORTAL_RULES.retentionNoticeDays * 86400_000));
    const warnCompetence = addMonthsToCompetence(noticeDay.slice(0, 7), -(PORTAL_RULES.retentionMonths + 1));
    const toWarn = await prisma.storedFile.findMany({
      where: { competence: warnCompetence, uploadedAt: { not: null } },
      distinct: ['customerId'],
      include: { customer: true },
    });
    for (const f of toWarn) {
      const deletesOn = retentionDeletionDate(warnCompetence);
      if (deletesOn <= today) continue;
      const sent = await sendOnce(f.customer, 'retention', warnCompetence, () =>
        renderRetentionNoticeEmail({
          customerName: f.customer.name,
          competence: warnCompetence,
          deletesOn,
          url: portalLink(`/documentos?competencia=${warnCompetence}&baixar=1`),
        }),
      );
      if (sent) retentionNotices++;
    }

    if (!this.storage.configured) return { retentionNotices, filesDeleted };

    // Competences whose deletion date has arrived: everything before this one.
    const keepFrom = addMonthsToCompetence(today.slice(0, 7), -PORTAL_RULES.retentionMonths);
    const expired = await prisma.storedFile.findMany({
      where: {
        OR: [{ competence: { lt: keepFrom } }, { uploadedAt: null, createdAt: { lt: new Date(now.getTime() - 86400_000) } }],
      },
      take: 500,
    });
    for (const f of expired) {
      try {
        await this.storage.delete(f.storageKey);
        await prisma.$transaction([
          prisma.taxGuide.deleteMany({ where: { fileId: f.id } }),
          prisma.taxGuide.updateMany({ where: { receiptFileId: f.id }, data: { receiptFileId: null } }),
          prisma.storedFile.delete({ where: { id: f.id } }),
        ]);
        filesDeleted++;
      } catch (err) {
        this.log.error(`Retention: could not delete file ${f.id}`, err as Error); // retried next day
      }
    }
    await prisma.documentRequest.deleteMany({ where: { competence: { lt: keepFrom } } });
    return { retentionNotices, filesDeleted };
  }
}
