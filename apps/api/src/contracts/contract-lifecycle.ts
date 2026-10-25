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
          customer: ev.customerId ? { update: { stripeCustomerId: ev.customerId } } : undefined,
          payments: {
            create: {
              amountCents: ev.amountCents,
              status: 'PAID',
              method: ev.method ?? c.method,
              stripePaymentIntentId: ev.paymentIntentId,
              mercadoPagoPaymentId: ev.mercadoPagoPaymentId,
              paidAt: now,
            },
          },
        },
      });
      return c.id;
    }

    case 'checkout.failed':
      await tx.contract.updateMany({
        where: { id: ev.contractId, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELED' },
      });
      return null;

    case 'subscription.started': {
      const c = await tx.contract.findUnique({ where: { id: ev.contractId } });
      if (!c) return null;
      const activates = c.status === 'PENDING_PAYMENT';
      await tx.contract.update({
        where: { id: c.id },
        data: {
          stripeSubscriptionId: ev.subscriptionId,
          customer: ev.customerId ? { update: { stripeCustomerId: ev.customerId } } : undefined,
          ...(activates && { status: 'ACTIVE', startsAt: now, endsAt: c.endsAt ?? addMonths(now, 1) }),
        },
      });
      return activates ? c.id : null;
    }

    case 'invoice.paid': {
      // invoice.paid may arrive before checkout.session.completed: fall back to the subscription metadata.
      const c =
        (await tx.contract.findUnique({ where: { stripeSubscriptionId: ev.subscriptionId } })) ??
        (ev.contractId ? await tx.contract.findUnique({ where: { id: ev.contractId } }) : null);
      if (!c || c.status === 'CANCELED') return null;
      await tx.payment.upsert({
        where: { stripeInvoiceId: ev.invoiceId },
        create: {
          contractId: c.id,
          amountCents: ev.amountCents,
          status: 'PAID',
          method: c.method,
          stripeInvoiceId: ev.invoiceId,
          paidAt: now,
        },
        update: {},
      });
      await tx.contract.update({
        where: { id: c.id },
        data: {
          status: 'ACTIVE',
          stripeSubscriptionId: ev.subscriptionId,
          startsAt: c.startsAt ?? now,
          endsAt: ev.periodEnd,
          expiryNoticeSentAt: null,
        },
      });
      return c.status === 'PENDING_PAYMENT' ? c.id : null;
    }

    case 'invoice.failed':
      await tx.contract.updateMany({
        where: { stripeSubscriptionId: ev.subscriptionId, status: 'ACTIVE' },
        data: { status: 'PAST_DUE' },
      });
      return null;

    case 'subscription.canceled':
      await tx.contract.updateMany({
        where: { stripeSubscriptionId: ev.subscriptionId, status: { in: ['ACTIVE', 'PAST_DUE', 'PENDING_PAYMENT'] } },
        data: { status: 'CANCELED' },
      });
      return null;
  }
}
