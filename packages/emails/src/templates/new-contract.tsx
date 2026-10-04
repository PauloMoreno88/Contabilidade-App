import { Section } from "@react-email/components";
import { PERIOD_MONTHS, PLANS } from "@exactra/shared";
import { methodLabel, newContractCopy as copy, periodLabel } from "../copy";
import { formatBRL, formatDate, safeUrl } from "../format";
import { H1, H2, Layout, Ledger, Mono, P, PrimaryButton, WhatsAppButton } from "../ui";
import type { ContractSummary } from "./welcome";

export type NewContractNoticeProps = {
  customer: { name: string; email: string; phone: string; document: string };
  contract: ContractSummary & { id: string };
  /** Where the customer came from, e.g. "Simulador (google / lancamento)". Omit when there is no lead. */
  source?: string | null;
  /** Link to the contract in the admin panel, e.g. https://www.../admin/contrato?id=... */
  adminUrl?: string;
};

export function NewContractNotice({ customer, contract: c, source, adminUrl }: NewContractNoticeProps) {
  const card = c.method === "CARD";
  const digits = customer.phone.replace(/\D/g, "");
  return (
    <Layout preview={copy.preview(customer.name)}>
      <H1>{copy.title}</H1>
      <P>{copy.lede}</P>

      <H2>{copy.customerTitle}</H2>
      <Ledger
        rows={[
          [copy.name, customer.name],
          [copy.email, customer.email],
          [copy.phone, <Mono key="p">{customer.phone}</Mono>],
          [copy.document, <Mono key="d">{customer.document}</Mono>],
          [copy.source, source || copy.noSource],
        ]}
      />

      <H2>{copy.contractTitle}</H2>
      <Ledger
        rows={[
          ["Plano", PLANS[c.plan].name],
          ["Pagamento", card ? methodLabel.CARD : `${methodLabel[c.method]}, ${periodLabel[c.period].toLowerCase()}`],
          ["Valor", <Mono key="v">{formatBRL(c.amountCents)}</Mono>, card ? "por mês" : `${PERIOD_MONTHS[c.period]} meses`],
          ["Início", <Mono key="s">{formatDate(c.startsAt)}</Mono>],
          [card ? "Próxima cobrança" : "Válido até", <Mono key="e">{c.endsAt ? formatDate(c.endsAt) : "—"}</Mono>],
          ["ID do contrato", <Mono key="i">{c.id}</Mono>],
        ]}
      />

      <Section style={{ marginTop: 28 }}>
        {adminUrl && <PrimaryButton href={safeUrl(adminUrl)}>{copy.adminCta}</PrimaryButton>}
        {adminUrl && digits && <span>&nbsp;&nbsp;</span>}
        {digits && <WhatsAppButton href={`https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`}>{copy.whatsappCta}</WhatsAppButton>}
      </Section>
    </Layout>
  );
}
