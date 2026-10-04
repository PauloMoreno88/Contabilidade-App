import { Column, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { onboarding, PERIOD_MONTHS, PLANS, whatsappLink, type BillingPeriod, type PaymentMethod, type PlanId } from "@exactra/shared";
import { methodLabel, periodLabel, welcomeCopy as copy } from "../copy";
import { firstName, formatBRL, formatDate, type DateInput } from "../format";
import { color, H1, H2, Layout, Ledger, Mono, P, Panel, Signature, WhatsAppButton, mono } from "../ui";

export type ContractSummary = {
  plan: PlanId;
  period: BillingPeriod;
  method: PaymentMethod;
  /** What was charged: monthly price on card, the whole prepaid period on Pix/boleto. */
  amountCents: number;
  startsAt: DateInput;
  /** Card: end of the current billing period (next charge). Pix/boleto: end of the prepaid period. */
  endsAt?: DateInput | null;
};

export type WelcomeEmailProps = { customerName: string; contract: ContractSummary };

export function WelcomeEmail({ customerName, contract: c }: WelcomeEmailProps) {
  const name = firstName(customerName);
  const plan = PLANS[c.plan];
  const card = c.method === "CARD";
  const months = PERIOD_MONTHS[c.period];

  return (
    <Layout preview={copy.preview}>
      <H1>{copy.title(name)}</H1>
      <P>{copy.lede}</P>

      <H2>{copy.summaryTitle}</H2>
      <Ledger
        rows={[
          [copy.plan, plan.name, plan.tagline],
          [copy.billing, card ? methodLabel.CARD : `${methodLabel[c.method]}, ${periodLabel[c.period].toLowerCase()}`],
          [copy.amount, <Mono key="v">{formatBRL(c.amountCents)}</Mono>, card ? copy.amountPerMonth : copy.amountPrepaid(months)],
          [copy.startsAt, <Mono key="s">{formatDate(c.startsAt)}</Mono>],
          ...(c.endsAt ? [[card ? copy.nextCharge : copy.endsAt, <Mono key="e">{formatDate(c.endsAt)}</Mono>] as [string, ReactNode]] : []),
        ]}
      />
      <P small style={{ margin: "10px 0 0" }}>{card ? copy.cardNote : copy.prepaidNote}</P>

      <H2>{copy.stepsTitle}</H2>
      <Section>
        {onboarding.steps.map((s, i) => {
          const done = i === 0;
          return (
            <Row key={s.title}>
              <Column style={{ width: 40, verticalAlign: "top", paddingTop: 2 }}>
                <Text
                  style={{
                    margin: 0,
                    width: 26,
                    height: 26,
                    lineHeight: "26px",
                    textAlign: "center",
                    borderRadius: 13,
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: done ? color.red : color.soft,
                    color: done ? "#FFFFFF" : color.faint,
                  }}
                  className={done ? undefined : "x-soft x-faint"}
                >
                  {done ? "✓" : i + 1}
                </Text>
              </Column>
              <Column style={{ verticalAlign: "top", paddingBottom: 14 }}>
                <Text className="x-text" style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: color.text }}>
                  {s.title}
                  {done && <span style={{ color: color.red, fontWeight: 500, fontSize: 13, paddingLeft: 8 }}>{copy.done}</span>}
                </Text>
                <Text className="x-muted" style={{ margin: 0, fontSize: 14, lineHeight: "21px", color: color.muted }}>{s.text}</Text>
              </Column>
            </Row>
          );
        })}
      </Section>

      <H2>{copy.docsTitle}</H2>
      <Panel>
        {onboarding.docs.map((d) => (
          <Text key={d} className="x-text" style={{ margin: "0 0 6px", fontSize: 14, lineHeight: "21px", color: color.text }}>
            <span style={{ color: color.red }}>■</span>&nbsp;&nbsp;{d}
          </Text>
        ))}
        <Text className="x-faint" style={{ margin: "10px 0 0", fontSize: 12, lineHeight: "18px", color: color.faint }}>{onboarding.docsNote}</Text>
      </Panel>

      <P style={{ margin: "28px 0 14px" }}>{copy.whatsappText}</P>
      <WhatsAppButton href={whatsappLink(copy.whatsappMessage(plan.name))}>{copy.whatsappCta}</WhatsAppButton>
      <Signature />
    </Layout>
  );
}
