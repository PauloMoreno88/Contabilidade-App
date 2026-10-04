import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { sendExpiryNotice } from '../notifications.js';

export const EXPIRY_NOTICE_DAYS = 7;

/**
 * Daily job for prepaid contracts (Pix/boleto), which do not renew by themselves:
 * warns EXPIRY_NOTICE_DAYS before the end and marks ended contracts as EXPIRED.
 * Card subscriptions are handled by Stripe webhooks.
 */
@Injectable()
export class ExpiryJob {
  private readonly log = new Logger(ExpiryJob.name);

  // ponytail: in-process cron, fine for one Render instance; use a Render Cron Job if the API scales out.
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async daily() {
    const r = await this.run();
    this.log.log(`expired=${r.expired} notified=${r.notified}`);
  }

  async run(now = new Date()) {
    const prepaid = { method: { in: ['PIX', 'BOLETO'] }, status: 'ACTIVE' } satisfies Prisma.ContractWhereInput;

    const { count: expired } = await prisma.contract.updateMany({
      where: { ...prepaid, endsAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });

    const due = await prisma.contract.findMany({
      where: { ...prepaid, expiryNoticeSentAt: null, endsAt: { lte: new Date(now.getTime() + EXPIRY_NOTICE_DAYS * 86400_000) } },
      include: { customer: true },
    });
    let notified = 0;
    for (const c of due) {
      try {
        await sendExpiryNotice(c);
        await prisma.contract.update({ where: { id: c.id }, data: { expiryNoticeSentAt: now } });
        notified++;
      } catch (err) {
        this.log.error(`Expiry notice failed for contract ${c.id}`, err as Error); // retried next day
      }
    }
    return { expired, notified };
  }
}
