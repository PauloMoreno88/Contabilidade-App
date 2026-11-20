import { Logger } from '@nestjs/common';
import { renderPortalInviteEmail } from '@exactra/emails';
import { createHash, randomBytes } from 'node:crypto';
import { PORTAL_RULES } from '@exactra/shared';
import { auth } from '../auth.js';
import { prisma } from '../db.js';
import { sendEmail } from '../email.js';
import type { Customer } from '../generated/prisma/client.js';
import { webOrigin } from '../web-origin.js';

const log = new Logger('Invites');

export const CUSTOMER_ROLE = 'customer';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const inviteUrl = (token: string) => `${webOrigin()}/entrar/ativar?token=${token}`;

/**
 * The login of a company's owner: an existing member, an existing customer login with the same
 * e-mail (one person, several companies), or a new Better Auth user with role "customer".
 * Returns null when the e-mail belongs to a staff account: staff never get a customer login.
 */
export async function ensurePortalUser(customer: Customer): Promise<{ userId: string; created: boolean } | null> {
  const member = await prisma.companyMember.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: 'asc' } });
  if (member) return { userId: member.userId, created: false };

  const email = customer.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== CUSTOMER_ROLE) {
    log.warn(`Customer ${customer.id} uses a staff e-mail: no customer login created`);
    return null;
  }
  let userId = existing?.id;
  if (!userId) {
    // Random password nobody knows: the customer sets the real one through the activation link.
    const created = await auth.api.createUser({
      body: { email, name: customer.name, password: randomBytes(32).toString('base64url'), role: CUSTOMER_ROLE },
    });
    userId = created.user.id;
  }
  await prisma.companyMember.create({ data: { userId, customerId: customer.id, role: 'OWNER' } });
  return { userId, created: !existing };
}

/** A fresh activation link (older unused ones stop working). Only the token's hash is stored. */
export async function createInvite(userId: string): Promise<{ url: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + PORTAL_RULES.inviteDays * 86400_000);
  await prisma.$transaction([
    prisma.customerInvite.deleteMany({ where: { userId, usedAt: null } }),
    prisma.customerInvite.create({ data: { userId, tokenHash: hashToken(token), expiresAt } }),
  ]);
  return { url: inviteUrl(token), expiresAt };
}

/** Activated = the customer has set a password through an invite (or already used the area). */
export async function isActivated(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  return Boolean(user?.emailVerified);
}

/** Creates the login if needed and e-mails the activation link. */
export async function sendInvite(customer: Customer): Promise<{ email: string; expiresAt: Date } | null> {
  const portalUser = await ensurePortalUser(customer);
  if (!portalUser) return null;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: portalUser.userId } });
  const { url, expiresAt } = await createInvite(user.id);
  await sendEmail({
    to: user.email,
    ...(await renderPortalInviteEmail({ name: user.name, companyName: customer.name, url, expiresInDays: PORTAL_RULES.inviteDays })),
  });
  return { email: user.email, expiresAt };
}
