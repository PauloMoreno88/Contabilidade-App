import { Body, Button, Column, Container, Head, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { contact } from "@exactra/shared";
import { brand } from "./copy";
import { assetBaseUrl } from "./format";

/** Exactra tokens, same palette as the landing (variant D). */
export const color = {
  page: "#EFF2F5",
  card: "#FFFFFF",
  petrol: "#10202B",
  text: "#10202B",
  muted: "#3E4F61",
  faint: "#56697C",
  line: "#DCE3E9",
  soft: "#F7F8FA",
  red: "#C82333",
  wa: "#25D366",
  waText: "#06130C",
};

const sans = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
export const mono = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/**
 * Dark mode for clients that honor prefers-color-scheme (Apple Mail, iOS,
 * Outlook for Mac). Gmail ignores <style> media queries and auto-inverts;
 * the petrol header and badge logo survive that too.
 */
const darkCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .x-page, .x-page > table > tbody > tr > td { background-color: #0B1620 !important; }
  .x-card { background-color: #13232F !important; border-color: #24394A !important; }
  .x-soft { background-color: #182B39 !important; }
  .x-text { color: #EEF3F7 !important; }
  .x-muted { color: #B7C4CF !important; }
  .x-faint { color: #93A4B3 !important; }
  .x-line { border-color: #24394A !important; }
}
@media only screen and (max-width: 620px) {
  .x-pad { padding-left: 20px !important; padding-right: 20px !important; }
  .x-h1 { font-size: 24px !important; line-height: 30px !important; }
}
`;

export function Layout({ preview, children }: { preview: string; children: ReactNode }) {
  const base = assetBaseUrl();
  return (
    <Html lang="pt-BR">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{darkCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="x-page" style={{ margin: 0, padding: "24px 0", backgroundColor: color.page, fontFamily: sans }}>
        <Container style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
          <Section
            data-skip-in-text="true"
            style={{ backgroundColor: color.petrol, borderRadius: "14px 14px 0 0", padding: "20px 32px" }}
            className="x-pad"
          >
            <Row>
              <Column style={{ width: 44 }}>
                <Img src={`${base}/email/logo.png`} width={30} height={32} alt="Exactra" style={{ display: "block" }} />
              </Column>
              <Column>
                <Text style={{ margin: 0, color: "#FFFFFF", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Exactra</Text>
              </Column>
            </Row>
          </Section>
          <Section
            className="x-card x-pad"
            style={{ backgroundColor: color.card, border: `1px solid ${color.line}`, borderTop: 0, borderRadius: "0 0 14px 14px", padding: "32px 32px 36px" }}
          >
            {children}
          </Section>
          <Section className="x-pad" style={{ padding: "20px 32px" }}>
            <Text className="x-faint" style={{ margin: "0 0 6px", fontSize: 12, lineHeight: "18px", color: color.faint }}>
              {brand.name}
              <br />
              <Link href={`mailto:${contact.email}`} className="x-faint" style={{ color: color.faint }}>{contact.email}</Link>
            </Text>
            <Text className="x-faint" style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: color.faint }}>
              {brand.footer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <Text className="x-text x-h1" style={{ margin: "0 0 12px", fontSize: 28, lineHeight: "34px", fontWeight: 600, letterSpacing: "-0.02em", color: color.text }}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <Text className="x-text" style={{ margin: "32px 0 12px", fontSize: 17, lineHeight: "24px", fontWeight: 600, color: color.text }}>
      {children}
    </Text>
  );
}

export function P({ children, small, style }: { children: ReactNode; small?: boolean; style?: CSSProperties }) {
  return (
    <Text
      className={small ? "x-faint" : "x-muted"}
      style={{ margin: "0 0 14px", fontSize: small ? 13 : 15, lineHeight: small ? "20px" : "24px", color: small ? color.faint : color.muted, ...style }}
    >
      {children}
    </Text>
  );
}

/** Label/value rows with hairlines, like the landing's ledger lists. */
export function Ledger({ rows }: { rows: [label: string, value: ReactNode, hint?: string][] }) {
  return (
    <Section className="x-line" style={{ borderTop: `1px solid ${color.line}` }}>
      {rows.map(([label, value, hint]) => (
        <Row key={label} className="x-line" style={{ borderBottom: `1px solid ${color.line}` }}>
          <Column style={{ padding: "12px 12px 12px 0", width: "40%", verticalAlign: "top" }}>
            <Text className="x-faint" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: color.faint }}>{label}</Text>
          </Column>
          <Column style={{ padding: "12px 0", textAlign: "right", verticalAlign: "top" }}>
            <Text className="x-text" style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: color.text, fontWeight: 600 }}>{value}</Text>
            {hint && <Text className="x-faint" style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: color.faint }}>{hint}</Text>}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: mono, fontWeight: 600 }}>{children}</span>;
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button href={href} style={{ backgroundColor: color.red, color: "#FFFFFF", fontSize: 15, fontWeight: 600, borderRadius: 8, padding: "13px 22px" }}>
      {children}
    </Button>
  );
}

export function WhatsAppButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button href={href} style={{ backgroundColor: color.wa, color: color.waText, fontSize: 15, fontWeight: 600, borderRadius: 8, padding: "13px 22px" }}>
      {children}
    </Button>
  );
}

/** Soft panel for secondary content (documents, notes). */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <Section className="x-soft" style={{ backgroundColor: color.soft, borderRadius: 10, padding: "16px 20px" }}>
      {children}
    </Section>
  );
}

export function FallbackLink({ href }: { href: string }) {
  return (
    <Link href={href} style={{ color: color.red, fontSize: 13, lineHeight: "20px", wordBreak: "break-all" }}>
      {href}
    </Link>
  );
}

export function Signature() {
  return (
    <P style={{ margin: "28px 0 0" }}>
      {brand.signature}
    </P>
  );
}
