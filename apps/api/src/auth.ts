import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, twoFactor } from 'better-auth/plugins';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { escapeHtml } from './notifications.js';
import { webOrigins } from './web-origin.js';

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;

export const auth = betterAuth({
  appName: 'Exactra Contabilidade',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: webOrigins(),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: admins are created by the seed or by another admin.
    disableSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Redefinição de senha — Exactra',
        html: `<p>Olá, ${escapeHtml(user.name)}.</p><p>Para criar uma nova senha, acesse: <a href="${url}">${url}</a></p><p>Se não foi você, ignore este e-mail.</p>`,
      });
    },
  },
  plugins: [
    admin(),
    twoFactor({
      issuer: 'Exactra',
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          await sendEmail({
            to: user.email,
            subject: 'Seu código de acesso — Exactra',
            html: `<p>Seu código de verificação é <strong>${otp}</strong>.</p>`,
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
