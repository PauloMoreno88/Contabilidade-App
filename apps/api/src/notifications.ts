import { Logger } from '@nestjs/common';
import { renderExpiryReminderEmail, renderNewContractNotice, renderPaymentAlertEmail, renderWelcomeEmail, type PaymentAlertReason } from '@exactra/emails';
import { PORTAL_RULES } from '@exactra/shared';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import type { Contract, Customer } from './generated/prisma/client.js';
import { createInvite, ensurePortalUser, isActivated } from './portal/invites.js';
import { webOrigin } from './web-origin.js';

const log = new Logger('Notifications');

const summary = (c: Contract) => ({
  plan: c.plan,
  period: c.period,
  method: c.method,
  amountCents: c.amountCents,
  startsAt: c.startsAt ?? c.createdAt,
  endsAt: c.endsAt,
});

/**
 * First-contract or renewal e-mail to the customer + internal notice. Never throws: the payment is already recorded.
 * The two sends are independent: a failure in one (e.g. a recipient Resend refuses) must not block the other.
 */
export async function notifyActivation(contractId: string): Promise<void> {
  let c: Contract & { customer: Customer & { lead: { utm: unknown } | null } };
  let renewal: boolean;
  try {
    c = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { customer: { include: { lead: true } } },
    });
    renewal = Boolean(await prisma.contract.count({
      where: { customerId: c.customerId, id: { not: c.id }, startsAt: { not: null }, status: { in: ['ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELED'] } },
    }));
  } catch (err) {
    log.error(`Activation e-mails skipped, contract or history ${contractId} not loaded`, err as Error);
    return;
  }
  const { customer } = c;

  // Customer area login (decision 24): the customer e-mail carries the activation link, so the
  // customer gets one e-mail. Renewals and logins already activated skip it.
  let activation: { url: string; expiresInDays: number } | undefined;
  try {
    const portalUser = await ensurePortalUser(customer);
    if (portalUser && !(await isActivated(portalUser.userId))) {
      activation = { url: (await createInvite(portalUser.userId)).url, expiresInDays: PORTAL_RULES.inviteDays };
    }
  } catch (err) {
    log.error(`Customer area login failed for contract ${contractId}`, err as Error);
  }

  try {
    await sendEmail({
      to: customer.email,
      ...(await renderWelcomeEmail({ customerName: customer.name, contract: summary(c), activation, renewal })),
    });
  } catch (err) {
    log.error(`Customer e-mail failed for contract ${contractId}`, err as Error);
  }

  if (!process.env.ADMIN_NOTIFY_EMAIL) return;
  try {
    const utm = customer.lead?.utm as { source?: string; campaign?: string } | null | undefined;
    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      ...(await renderNewContractNotice({
        customer: { name: customer.name, email: customer.email, phone: customer.phone, document: customer.document },
        contract: { ...summary(c), id: c.id },
        renewal,
        source: !renewal && customer.lead
          ? `Simulador (${[utm?.source, utm?.campaign].filter(Boolean).join(' / ') || 'direto'})`
          : null,
        adminUrl: `${webOrigin()}/admin/contrato?id=${c.id}`,
      })),
    });
  } catch (err) {
    log.error(`Internal notice e-mail failed for contract ${contractId}`, err as Error);
  }
}

export type PaymentAlert = { reason: PaymentAlertReason; contractId: string; paymentId: string; amountCents?: number };

/** Tells the Exactra team that a payment needs a person. Never throws: the webhook is already recorded. */
export async function sendPaymentAlert({ reason, contractId, paymentId, amountCents }: PaymentAlert): Promise<void> {
  // The log keeps the case visible if the e-mail fails or ADMIN_NOTIFY_EMAIL is not set.
  log.warn(`Payment alert ${reason}: contract ${contractId}, payment ${paymentId}`);
  if (!process.env.ADMIN_NOTIFY_EMAIL) return;
  try {
    const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { customer: true } });
    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      ...(await renderPaymentAlertEmail({
        reason,
        paymentId,
        contractId,
        customerName: contract?.customer.name,
        customerEmail: contract?.customer.email,
        contractAmountCents: contract?.amountCents,
        paidAmountCents: amountCents,
        url: contract ? `${webOrigin()}/admin/contrato?id=${contract.id}` : `${webOrigin()}/admin`,
      })),
    });
  } catch (err) {
    log.error(`Payment alert e-mail failed for contract ${contractId}`, err as Error);
  }
}

/** Pix/boleto do not renew by themselves: remind the customer before the prepaid period ends. */
export async function sendExpiryNotice(c: Contract & { customer: Customer }): Promise<void> {
  // Customers with a login renew in the customer area (same company, starts when this contract ends).
  const hasLogin = await prisma.companyMember.count({ where: { customerId: c.customerId } });
  await sendEmail({
    to: c.customer.email,
    ...(await renderExpiryReminderEmail({
      customerName: c.customer.name,
      contract: { ...summary(c), endsAt: c.endsAt! },
      renewUrl: hasLogin ? `${webOrigin()}/app/plano` : undefined,
    })),
  });
}
