import { PERIOD_MONTHS } from '@exactra/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { PaymentEvent } from '../payments/payment-provider.js';

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
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
      if (!c || c.status !== 'PENDING_PAYMENT') return null;
      await tx.contract.update({
        where: { id: c.id },
        data: {
          status: 'ACTIVE',
          startsAt: now,
          endsAt: addMonths(now, PERIOD_MONTHS[c.period]),
          customer: ev.customerId ? { update: { stripeCustomerId: ev.customerId } } : undefined,
          payments: {
            create: {
              amountCents: ev.amountCents,
              status: 'PAID',
              method: c.method,
              stripePaymentIntentId: ev.paymentIntentId,
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
