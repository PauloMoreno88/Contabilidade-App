import { Logger } from '@nestjs/common';
import { PERIOD_MONTHS, PLANS } from '@exactra/shared';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import type { Contract, Customer } from './generated/prisma/client.js';

const log = new Logger('Notifications');

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const methodLabel = { CARD: 'cartão (mensal)', PIX: 'Pix', BOLETO: 'boleto' } as const;

function describe(c: Contract) {
  const plan = PLANS[c.plan].name;
  return c.method === 'CARD' ? `Plano ${plan}, mensal no cartão` : `Plano ${plan}, ${PERIOD_MONTHS[c.period]} meses (${methodLabel[c.method]})`;
}

/** Welcome e-mail to the customer + internal notice. Never throws: the payment is already recorded. */
export async function notifyActivation(contractId: string): Promise<void> {
  try {
    const c = await prisma.contract.findUniqueOrThrow({ where: { id: contractId }, include: { customer: true } });
    const name = escapeHtml(c.customer.name.split(' ')[0]);
    await sendEmail({
      to: c.customer.email,
      subject: 'Bem-vindo à Exactra Contabilidade',
      html: `<p>Olá, ${name}!</p>
<p>Seu pagamento foi confirmado e sua contratação está ativa: <strong>${describe(c)}</strong>.</p>
<p>Nossa equipe vai entrar em contato pelo WhatsApp em até 1 dia útil para começar o seu atendimento.</p>
<p>Equipe Exactra Contabilidade</p>`,
    });
    if (process.env.ADMIN_NOTIFY_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_NOTIFY_EMAIL,
        subject: `Nova contratação: ${c.customer.name} — ${PLANS[c.plan].name}`,
        html: `<p><strong>${escapeHtml(c.customer.name)}</strong> ativou ${describe(c)}.</p>
<ul>
<li>E-mail: ${escapeHtml(c.customer.email)}</li>
<li>Telefone: ${escapeHtml(c.customer.phone)}</li>
<li>CPF/CNPJ: ${escapeHtml(c.customer.document)}</li>
<li>Valor: ${brl(c.amountCents)}</li>
<li>Vigência até: ${c.endsAt ? date(c.endsAt) : '—'}</li>
</ul>`,
      });
    }
  } catch (err) {
    log.error(`Activation e-mails failed for contract ${contractId}`, err as Error);
  }
}

/** Pix/boleto do not renew by themselves: remind the customer before the prepaid period ends. */
export async function sendExpiryNotice(c: Contract & { customer: Customer }): Promise<void> {
  await sendEmail({
    to: c.customer.email,
    subject: 'Seu plano na Exactra está perto do vencimento',
    html: `<p>Olá, ${escapeHtml(c.customer.name.split(' ')[0])}!</p>
<p>Seu ${describe(c)} vence em <strong>${date(c.endsAt!)}</strong>.</p>
<p>Para continuar com o atendimento sem interrupção, renove pelo nosso site ou responda este e-mail que a gente ajuda.</p>
<p>Equipe Exactra Contabilidade</p>`,
  });
}
