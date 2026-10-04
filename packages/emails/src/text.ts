import { contact, onboarding, PERIOD_MONTHS, PLANS, whatsappLink } from "@exactra/shared";
import {
  brand,
  expiryCopy,
  methodLabel,
  newContractCopy,
  passwordResetCopy,
  periodLabel,
  twoFactorCopy,
  welcomeCopy,
} from "./copy";
import { assetBaseUrl, firstName, formatBRL, formatDate } from "./format";
import type { PasswordResetEmailProps, TwoFactorCodeEmailProps } from "./templates/auth";
import type { ExpiryReminderEmailProps } from "./templates/expiry";
import type { NewContractNoticeProps } from "./templates/new-contract";
import type { ContractSummary, WelcomeEmailProps } from "./templates/welcome";

/** Plain-text versions, written by hand so they read well in text-only clients. */

const footer = `--\n${brand.name}\n${contact.email}\n${brand.footer}`;
const join = (...blocks: (string | false | null | undefined)[]) => blocks.filter(Boolean).join("\n\n") + "\n";
const rows = (pairs: [string, string][]) => pairs.map(([k, v]) => `${k}: ${v}`).join("\n");

const billing = (c: ContractSummary) => (c.method === "CARD" ? methodLabel.CARD : `${methodLabel[c.method]}, ${periodLabel[c.period].toLowerCase()}`);

export function welcomeText({ customerName, contract: c }: WelcomeEmailProps) {
  const copy = welcomeCopy;
  const card = c.method === "CARD";
  const plan = PLANS[c.plan].name;
  return join(
    copy.title(firstName(customerName)),
    copy.lede,
    `${copy.summaryTitle.toUpperCase()}\n${rows([
      [copy.plan, plan],
      [copy.billing, billing(c)],
      [copy.amount, `${formatBRL(c.amountCents)} ${card ? copy.amountPerMonth : copy.amountPrepaid(PERIOD_MONTHS[c.period])}`],
      [copy.startsAt, formatDate(c.startsAt)],
      ...(c.endsAt ? [[card ? copy.nextCharge : copy.endsAt, formatDate(c.endsAt)] as [string, string]] : []),
    ])}\n${card ? copy.cardNote : copy.prepaidNote}`,
    `${copy.stepsTitle.toUpperCase()}\n${onboarding.steps
      .map((s, i) => `${i + 1}. ${s.title}${i === 0 ? ` (${copy.done.toLowerCase()})` : ""}\n   ${s.text}`)
      .join("\n")}`,
    `${copy.docsTitle.toUpperCase()}\n${onboarding.docs.map((d) => `- ${d}`).join("\n")}\n${onboarding.docsNote}`,
    `${copy.whatsappText}\n${whatsappLink(copy.whatsappMessage(plan))}`,
    brand.signature,
    footer,
  );
}

export function newContractText({ customer, contract: c, source, adminUrl }: NewContractNoticeProps) {
  const copy = newContractCopy;
  return join(
    copy.title,
    copy.lede,
    `${copy.customerTitle.toUpperCase()}\n${rows([
      [copy.name, customer.name],
      [copy.email, customer.email],
      [copy.phone, customer.phone],
      [copy.document, customer.document],
      [copy.source, source || copy.noSource],
    ])}`,
    `${copy.contractTitle.toUpperCase()}\n${rows([
      ["Plano", PLANS[c.plan].name],
      ["Pagamento", billing(c)],
      ["Valor", `${formatBRL(c.amountCents)} ${c.method === "CARD" ? "por mês" : `por ${PERIOD_MONTHS[c.period]} meses`}`],
      ["Início", formatDate(c.startsAt)],
      [c.method === "CARD" ? "Próxima cobrança" : "Válido até", c.endsAt ? formatDate(c.endsAt) : "—"],
      ["ID do contrato", c.id],
    ])}`,
    adminUrl && `${copy.adminCta}: ${adminUrl}`,
    footer,
  );
}

export function passwordResetText({ name, url, expiresInMinutes }: PasswordResetEmailProps) {
  const copy = passwordResetCopy;
  return join(
    copy.title,
    copy.lede(firstName(name)),
    `${copy.cta}:\n${url}`,
    expiresInMinutes ? copy.expires(expiresInMinutes) : copy.expiresUnknown,
    copy.ignore,
    brand.signature,
    footer,
  );
}

export function twoFactorText({ name, code, expiresInMinutes }: TwoFactorCodeEmailProps) {
  const copy = twoFactorCopy;
  return join(
    copy.title,
    copy.lede(name ? firstName(name) : undefined),
    code,
    expiresInMinutes ? copy.expires(expiresInMinutes) : copy.expiresUnknown,
    copy.ignore,
    brand.signature,
    footer,
  );
}

export function expiryText({ customerName, contract: c, renewUrl }: ExpiryReminderEmailProps) {
  const copy = expiryCopy;
  const plan = PLANS[c.plan].name;
  const ends = formatDate(c.endsAt);
  return join(
    copy.title(firstName(customerName)),
    copy.lede(plan, ends),
    `${copy.summaryTitle.toUpperCase()}\n${rows([
      ["Plano", plan],
      ["Pagamento", billing(c)],
      ["Valor pago", formatBRL(c.amountCents)],
      [copy.endsAt, ends],
    ])}`,
    `${copy.cta}:\n${renewUrl ?? `${assetBaseUrl()}/checkout?plan=${c.plan}`}`,
    `${copy.help}\n${whatsappLink(copy.whatsappMessage)}`,
    brand.signature,
    footer,
  );
}
