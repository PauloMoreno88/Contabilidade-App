import { renderPasswordResetEmail, renderTwoFactorCodeEmail } from '@exactra/emails';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, twoFactor } from 'better-auth/plugins';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { webOrigins } from './web-origin.js';

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
// Better Auth defaults, set explicitly so the e-mails can state them.
const RESET_TOKEN_MINUTES = 60;
const OTP_MINUTES = 3;

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
    resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        ...(await renderPasswordResetEmail({ name: user.name, url, expiresInMinutes: RESET_TOKEN_MINUTES })),
      });
    },
  },
  plugins: [
    admin(),
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
