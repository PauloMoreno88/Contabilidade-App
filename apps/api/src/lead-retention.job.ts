import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from './db.js';

/** The privacy policy (apps/web/src/config/legal.ts) promises simulator data is kept for up to 1 month. */
export const LEAD_RETENTION_DAYS = 30;

/**
 * Daily job that deletes simulator leads older than LEAD_RETENTION_DAYS that never became a customer.
 * Leads linked to a customer stay: they belong to the contract record.
 */
@Injectable()
export class LeadRetentionJob {
  private readonly log = new Logger(LeadRetentionJob.name);

  // Same in-process cron caveat as ExpiryJob.
  @Cron('0 3 * * *', { timeZone: 'America/Sao_Paulo' })
  async daily() {
    const r = await this.run();
    this.log.log(`deleted=${r.deleted}`);
  }

  async run(now = new Date()) {
    const { count: deleted } = await prisma.lead.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - LEAD_RETENTION_DAYS * 86400_000) }, customers: { none: {} } },
    });
    return { deleted };
  }
}
