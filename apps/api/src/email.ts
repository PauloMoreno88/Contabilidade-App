import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

const log = new Logger('Email');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Without a verified domain Resend only delivers to the account owner (sender onboarding@resend.dev).
if (resend && /@resend\.dev\b/i.test(process.env.EMAIL_FROM ?? '')) {
  log.warn(
    'EMAIL_FROM uses resend.dev: Resend is in test mode and only delivers to the account owner. Verify a domain and update EMAIL_FROM.',
  );
}

/** Rendered by @exactra/emails ({ subject, html, text }) plus the recipient. */
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends through Resend. Without RESEND_API_KEY (dev/tests) it only logs, never in production.
 * EMAIL_REPLY_TO (optional) is where customers' replies go: the sending address is not a real mailbox.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set');
    console.log(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return;
  }
  const { to, subject, html, text } = email;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
