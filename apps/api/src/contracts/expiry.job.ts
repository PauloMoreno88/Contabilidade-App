import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { sendExpiryNotice } from '../notifications.js';
import { MERCADO_PAGO_PENDING_DAYS } from '../payments/mercado-pago.provider.js';

export const EXPIRY_NOTICE_DAYS = 7;

/**
 * Daily job for the one-year prepaid contracts, which do not renew by themselves: warns
 * EXPIRY_NOTICE_DAYS before the end, marks ended contracts as EXPIRED and cancels abandoned checkouts.
 */
@Injectable()
export class ExpiryJob {
  private readonly log = new Logger(ExpiryJob.name);

  // ponytail: in-process cron, fine for one Render instance; use a Render Cron Job if the API scales out.
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async daily() {
    const r = await this.run();
    this.log.log(`expired=${r.expired} notified=${r.notified} abandoned=${r.abandoned}`);
  }

  async run(now = new Date()) {
    const prepaid = { status: 'ACTIVE' } satisfies Prisma.ContractWhereInput;

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
        // Already renewed: the next contract starts when this one ends.
        const renewed = await prisma.contract.count({ where: { customerId: c.customerId, status: 'ACTIVE', endsAt: { gt: c.endsAt! } } });
        if (!renewed) await sendExpiryNotice(c);
        await prisma.contract.update({ where: { id: c.id }, data: { expiryNoticeSentAt: now } });
        notified++;
      } catch (err) {
        this.log.error(`Expiry notice failed for contract ${c.id}`, err as Error); // retried next day
      }
    }

    // Mercado Pago has no "checkout expired" event. A payment that still arrives later warns the team (webhook.controller.ts).
    // Any provider: old Stripe test checkouts left pending no longer get Stripe's expiry event.
    const { count: abandoned } = await prisma.contract.updateMany({
      where: { source: 'CHECKOUT', status: 'PENDING_PAYMENT', createdAt: { lte: new Date(now.getTime() - MERCADO_PAGO_PENDING_DAYS * 86400_000) } },
      data: { status: 'CANCELED' },
    });
    return { expired, notified, abandoned };
  }
}
