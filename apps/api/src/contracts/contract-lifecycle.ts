import { PERIOD_MONTHS } from '@exactra/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { PaymentEvent } from '../payments/payment-provider.js';

/** Same day N months later (UTC). A day the target month lacks (31st, 29/02) becomes its last day. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Applies a verified payment event to the contract (PENDING_PAYMENT → ACTIVE → PAST_DUE | CANCELED | EXPIRED).
 * Runs inside the same transaction that records the WebhookEvent, so a retry never applies twice.
 * Returns the id of a contract that has just become ACTIVE for the first time (to send welcome e-mails).
 */
export async function applyPaymentEvent(tx: Prisma.TransactionClient, ev: PaymentEvent): Promise<string | null> {
  const now = new Date();
  switch (ev.type) {
    case 'prepaid.paid': {
      const c = await tx.contract.findUnique({ where: { id: ev.contractId } });
      if (!c || c.status !== 'PENDING_PAYMENT' || c.provider !== ev.provider || c.amountCents !== ev.amountCents) return null;
      // A renewal paid before the current contract ends starts when it ends (no days lost).
      const current = await tx.contract.findFirst({
        where: { customerId: c.customerId, id: { not: c.id }, status: 'ACTIVE', endsAt: { gt: now } },
        orderBy: { endsAt: 'desc' },
      });
      const startsAt = current?.endsAt ?? now;
      await tx.contract.update({
        where: { id: c.id },
        data: {
          status: 'ACTIVE',
          method: ev.method ?? c.method,
          startsAt,
          endsAt: addMonths(startsAt, PERIOD_MONTHS[c.period]),
          payments: {
            create: {
              amountCents: ev.amountCents,
              status: 'PAID',
              method: ev.method ?? c.method,
              mercadoPagoPaymentId: ev.mercadoPagoPaymentId,
              paidAt: now,
            },
          },
        },
      });
      return c.id;
    }

    case 'payment.reversed':
      await tx.contract.updateMany({
        where: { id: ev.contractId, status: { in: ['PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE'] } },
        data: { status: 'CANCELED' },
      });
      return null;

    case 'payment.attention':
      return null;
  }
}
