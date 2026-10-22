import { BillingPeriod, PaymentMethod, PERIOD_MONTHS, PlanId, StoredPlanId } from "./enums";

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
  features: string[];
}

/** A single plan on sale (docs/plano.md, decision 20). */
export const PLANS: Record<PlanId, PlanConfig> = {
  exactra: {
    id: "exactra",
    name: "Plano Exactra",
    tagline: "Para prestadores de serviço, profissionais liberais e pequenos negócios",
    monthlyPriceCents: 29900,
    features: [
      "Abertura de CNPJ inclusa",
      "Troca de contador sem custo",
      "Impostos calculados e guias prontas",
      "Declarações entregues no prazo",
      "Pró-labore dos sócios",
      "Folha de até 3 funcionários",
      "Revisão do regime para pagar menos",
      "Balanço e relatórios do ano",
      "Atendimento por WhatsApp e vídeo",
      "Lembretes de vencimento",
    ],
  },
};

/** The plan sold today. */
export const CURRENT_PLAN = PLANS.exactra;

/** Names of the plans sold before decision 20, for contracts and leads already stored. */
const LEGACY_PLAN_NAMES: Record<Exclude<StoredPlanId, PlanId>, string> = {
  essencial: "Essencial (antigo)",
  profissional: "Profissional (antigo)",
  empresarial: "Empresarial (antigo)",
};

/** Display name and tagline of any stored plan id, current or legacy. */
export function planInfo(id: StoredPlanId): { name: string; tagline: string } {
  if (id in PLANS) return PLANS[id as PlanId];
  return { name: LEGACY_PLAN_NAMES[id as Exclude<StoredPlanId, PlanId>], tagline: "" };
}

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
