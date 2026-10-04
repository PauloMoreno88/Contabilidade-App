import { Section } from "@react-email/components";
import { PLANS, whatsappLink } from "@exactra/shared";
import { expiryCopy as copy, methodLabel, periodLabel } from "../copy";
import { assetBaseUrl, firstName, formatBRL, formatDate, safeUrl, type DateInput } from "../format";
import { H1, H2, Layout, Ledger, Mono, P, PrimaryButton, Signature, WhatsAppButton } from "../ui";
import type { ContractSummary } from "./welcome";

export type ExpiryReminderEmailProps = {
  customerName: string;
  contract: ContractSummary & { endsAt: DateInput };
  /** Defaults to {EMAIL_ASSET_BASE_URL}/checkout?plan={plan}. */
  renewUrl?: string;
};

export function ExpiryReminderEmail({ customerName, contract: c, renewUrl }: ExpiryReminderEmailProps) {
  const plan = PLANS[c.plan];
  const ends = formatDate(c.endsAt);
  return (
    <Layout preview={copy.preview}>
      <H1>{copy.title(firstName(customerName))}</H1>
      <P>{copy.lede(plan.name, ends)}</P>

      <H2>{copy.summaryTitle}</H2>
      <Ledger
        rows={[
          ["Plano", plan.name],
          ["Pagamento", `${methodLabel[c.method]}, ${periodLabel[c.period].toLowerCase()}`],
          ["Valor pago", <Mono key="v">{formatBRL(c.amountCents)}</Mono>],
          [copy.endsAt, <Mono key="e">{ends}</Mono>],
        ]}
      />

      <Section style={{ marginTop: 28 }}>
        <PrimaryButton href={safeUrl(renewUrl ?? `${assetBaseUrl()}/checkout?plan=${c.plan}`)}>{copy.cta}</PrimaryButton>
      </Section>
      <P style={{ margin: "24px 0 14px" }}>{copy.help}</P>
      <WhatsAppButton href={whatsappLink(copy.whatsappMessage)}>{copy.whatsappCta}</WhatsAppButton>
      <Signature />
    </Layout>
  );
}
