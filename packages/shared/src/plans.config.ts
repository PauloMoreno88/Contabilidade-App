import { BillingPeriod, PaymentMethod, PERIOD_MONTHS, PlanId } from "./enums";

/**
 * PLACEHOLDER: every value in this file is fictional until the accountant
 * validates prices (see docs/perguntas-contador.md, section A).
 * Prices are in BRL cents.
 */
export const PRICES_ARE_PLACEHOLDER = true;

export interface PlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  highlighted?: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  essencial: {
    id: "essencial",
    name: "Essencial",
    tagline: "Para quem está começando",
    monthlyPriceCents: 19900,
    features: ["Abertura e regularização de CNPJ", "Impostos mensais", "Suporte por WhatsApp"],
  },
  profissional: {
    id: "profissional",
    name: "Profissional",
    tagline: "Para quem já está rodando",
    monthlyPriceCents: 39900,
    highlighted: true,
    features: ["Tudo do Essencial", "Pró-labore e folha básica", "Planejamento tributário"],
  },
  empresarial: {
    id: "empresarial",
    name: "Empresarial",
    tagline: "Para operações maiores",
    monthlyPriceCents: 89900,
    features: ["Tudo do Profissional", "Folha completa", "Atendimento prioritário"],
  },
};

/** PLACEHOLDER discounts for prepaid periods (Pix/boleto). Fraction off the monthly price. */
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = {
  MONTHLY: 0,
  QUARTERLY: 0.05,
  SEMIANNUAL: 0.1,
  ANNUAL: 0.15,
};

/** Card is a monthly recurring subscription; Pix and boleto are prepaid for 3/6/12 months. */
export function allowedPeriods(method: PaymentMethod): BillingPeriod[] {
  return method === "CARD" ? ["MONTHLY"] : ["QUARTERLY", "SEMIANNUAL", "ANNUAL"];
}

/** Total charged now, in cents, for the plan/period. */
export function totalPriceCents(plan: PlanId, period: BillingPeriod): number {
  const months = PERIOD_MONTHS[period];
  const gross = PLANS[plan].monthlyPriceCents * months;
  return Math.round(gross * (1 - PERIOD_DISCOUNT[period]));
}
