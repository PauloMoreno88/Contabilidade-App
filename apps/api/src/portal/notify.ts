import { Logger } from '@nestjs/common';
import type { EmailContent } from '@exactra/emails';
import { prisma } from '../db.js';
import { sendEmail } from '../email.js';
import type { Customer } from '../generated/prisma/client.js';
import { webOrigin } from '../web-origin.js';

const log = new Logger('PortalNotify');

/** Links in e-mails go straight to the item. */
export const portalLink = (path: string) => `${webOrigin()}/app${path}`;

/** Everyone with a login for the company; the company e-mail when nobody has one yet. */
export async function recipientsOf(customer: Customer): Promise<string[]> {
  const members = await prisma.companyMember.findMany({ where: { customerId: customer.id }, include: { user: { select: { email: true } } } });
  const emails = [...new Set(members.map((m) => m.user.email.toLowerCase()))];
  return emails.length ? emails : [customer.email];
}

export async function sendToCompany(customer: Customer, email: EmailContent) {
  for (const to of await recipientsOf(customer)) await sendEmail({ to, ...email });
}

/**
 * Sends at most once per (company, kind, ref), across retries and job runs.
 * The log row is written first; if sending fails it is removed so the next run tries again.
 */
export async function sendOnce(customer: Customer, kind: string, ref: string, render: () => Promise<EmailContent>): Promise<boolean> {
  const { count } = await prisma.notificationLog.createMany({ data: { customerId: customer.id, kind, ref }, skipDuplicates: true });
  if (count === 0) return false;
  try {
    await sendToCompany(customer, await render());
    return true;
  } catch (err) {
    await prisma.notificationLog.deleteMany({ where: { customerId: customer.id, kind, ref } });
    log.error(`${kind} ${ref} failed for customer ${customer.id}`, err as Error);
    return false;
  }
}
