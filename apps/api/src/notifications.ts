import { Logger } from '@nestjs/common';
import { renderExpiryReminderEmail, renderNewContractNotice, renderWelcomeEmail } from '@exactra/emails';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import type { Contract, Customer } from './generated/prisma/client.js';
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
 * Welcome e-mail to the customer + internal notice. Never throws: the payment is already recorded.
 * The two sends are independent: a failure in one (e.g. a recipient Resend refuses) must not block the other.
 */
export async function notifyActivation(contractId: string): Promise<void> {
  let c: Contract & { customer: Customer & { lead: { utm: unknown } | null } };
  try {
    c = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { customer: { include: { lead: true } } },
    });
  } catch (err) {
    log.error(`Activation e-mails skipped, contract ${contractId} not loaded`, err as Error);
    return;
  }
  const { customer } = c;

  try {
    await sendEmail({
      to: customer.email,
      ...(await renderWelcomeEmail({ customerName: customer.name, contract: summary(c) })),
    });
  } catch (err) {
    log.error(`Welcome e-mail failed for contract ${contractId}`, err as Error);
  }

  if (!process.env.ADMIN_NOTIFY_EMAIL) return;
  try {
    const utm = customer.lead?.utm as { source?: string; campaign?: string } | null | undefined;
    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      ...(await renderNewContractNotice({
        customer: { name: customer.name, email: customer.email, phone: customer.phone, document: customer.document },
        contract: { ...summary(c), id: c.id },
        source: customer.lead
          ? `Simulador (${[utm?.source, utm?.campaign].filter(Boolean).join(' / ') || 'direto'})`
          : null,
        adminUrl: `${webOrigin()}/admin/contrato?id=${c.id}`,
      })),
    });
  } catch (err) {
    log.error(`Internal notice e-mail failed for contract ${contractId}`, err as Error);
  }
}

/** Pix/boleto do not renew by themselves: remind the customer before the prepaid period ends. */
export async function sendExpiryNotice(c: Contract & { customer: Customer }): Promise<void> {
  await sendEmail({
    to: c.customer.email,
    ...(await renderExpiryReminderEmail({
      customerName: c.customer.name,
      contract: { ...summary(c), endsAt: c.endsAt! },
    })),
  });
}
