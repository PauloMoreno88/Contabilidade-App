import { renderMagicLinkEmail, renderPasswordResetEmail, renderTwoFactorCodeEmail } from '@exactra/emails';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, magicLink, twoFactor } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { webOrigins } from './web-origin.js';

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
// Better Auth defaults, set explicitly so the e-mails can state them.
const RESET_TOKEN_MINUTES = 60;
const OTP_MINUTES = 3;
const MAGIC_LINK_MINUTES = 15;

// "customer" = login of the customer area (/app). No admin permissions: it cannot list, create or ban users.
const ac = createAccessControl(defaultStatements);
const roles = { admin: ac.newRole(adminAc.statements), user: ac.newRole(userAc.statements), customer: ac.newRole({ user: [], session: [] }) };

export const auth = betterAuth({
  appName: 'Exactra Contabilidade',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: webOrigins(),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: admins come from the seed, customers from a paid contract or the admin (role "customer").
    disableSignUp: true,
    resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        ...(await renderPasswordResetEmail({ name: user.name, url, expiresInMinutes: RESET_TOKEN_MINUTES })),
      });
    },
  },
  // Signed session copy in a cookie: most requests skip the database lookup. A revoked session keeps working for up to 5 min.
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  plugins: [
    admin({ ac, roles }),
    // "Entrar com link" for customers only. Never for staff or for accounts with 2FA: the link
    // signs in without the second factor. Unknown e-mails get nothing (and the same answer).
    magicLink({
      disableSignUp: true,
      expiresIn: MAGIC_LINK_MINUTES * 60,
      sendMagicLink: async ({ email, url }) => {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || user.role !== 'customer' || user.twoFactorEnabled || user.banned) return;
        await sendEmail({ to: user.email, ...(await renderMagicLinkEmail({ name: user.name, url, expiresInMinutes: MAGIC_LINK_MINUTES })) });
      },
    }),
    twoFactor({
      issuer: 'Exactra',
      otpOptions: {
        period: OTP_MINUTES,
        sendOTP: async ({ user, otp }) => {
          await sendEmail({
            to: user.email,
            ...(await renderTwoFactorCodeEmail({ name: user.name, code: otp, expiresInMinutes: OTP_MINUTES })),
          });
        },
      },
    }),
  ],
  advanced: {
    // Production: AUTH_COOKIE_DOMAIN=.exactracontabilidade.com.br shares the session between www. and api.
    crossSubDomainCookies: { enabled: Boolean(cookieDomain), domain: cookieDomain },
  },
});
