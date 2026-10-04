import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Rendered by @exactra/emails ({ subject, html, text }) plus the recipient. */
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends through Resend. Without RESEND_API_KEY (dev/tests) it only logs, never in production. */
export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set');
    console.log(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return;
  }
  const { to, subject, html, text } = email;
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
}
