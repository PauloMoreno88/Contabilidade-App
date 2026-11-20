import { Section, Text } from "@react-email/components";
import { whatsappLink } from "@exactra/shared";
import { safeUrl } from "../format";
import { color, FallbackLink, H1, H2, Layout, Ledger, Mono, P, Panel, PrimaryButton, Signature, WhatsAppButton } from "../ui";

/** Every customer area e-mail has the same shape: title, lede, optional details, one button. */
export type PortalMessage = {
  subject: string;
  preview: string;
  title: string;
  lede: string;
  /** Label/value rows (mono = numbers and dates). */
  rows?: [label: string, value: string, mono?: boolean][];
  list?: { title: string; items: string[] };
  cta: { label: string; url: string };
  /** Small print under the button. */
  notes?: string[];
  /** Shows the raw link under the button (activation and sign-in links). */
  fallbackLink?: string;
  /** WhatsApp button with this message. */
  whatsapp?: string;
};

export function PortalEmail({ m }: { m: PortalMessage }) {
  const href = safeUrl(m.cta.url);
  return (
    <Layout preview={m.preview}>
      <H1>{m.title}</H1>
      <P>{m.lede}</P>
      {m.rows && <Ledger rows={m.rows.map(([label, value, mono]) => [label, mono ? <Mono key={label}>{value}</Mono> : value])} />}
      {m.list && (
        <>
          <H2>{m.list.title}</H2>
          <Panel>
            {m.list.items.map((d) => (
              <Text key={d} className="x-text" style={{ margin: "0 0 6px", fontSize: 14, lineHeight: "21px", color: color.text }}>
                <span style={{ color: color.red }}>■</span>&nbsp;&nbsp;{d}
              </Text>
            ))}
          </Panel>
        </>
      )}
      <Section style={{ margin: "26px 0 18px" }}>
        <PrimaryButton href={href}>{m.cta.label}</PrimaryButton>
      </Section>
      {m.notes?.map((n) => (
        <P key={n} small>{n}</P>
      ))}
      {m.fallbackLink && <FallbackLink href={safeUrl(m.fallbackLink)} />}
      {m.whatsapp && (
        <Section style={{ marginTop: 22 }}>
          <WhatsAppButton href={whatsappLink(m.whatsapp)}>Falar no WhatsApp</WhatsAppButton>
        </Section>
      )}
      <Signature />
    </Layout>
  );
}
