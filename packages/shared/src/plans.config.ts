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
  /** Price of the one-year contract. */
  annualPriceCents: number;
  /** Card installments allowed for the annual price. */
  maxInstallments: number;
  features: string[];
}

/** A single plan on sale (docs/plano.md, decision 20), sold as a one-year contract (decision 22). */
export const PLANS: Record<PlanId, PlanConfig> = {
  exactra: {
    id: "exactra",
    name: "Plano Exactra",
    tagline: "Para prestadores de serviço, profissionais liberais e pequenos negócios",
    annualPriceCents: 358800, // PLACEHOLDER: 12 × R$ 299 until Exactra sets the annual price
    maxInstallments: 12,
    features: [
      "Contabilidade completa",
      "Impostos calculados e guias prontas",
      "Guias centralizadas, enviadas por e-mail",
      "Declarações obrigatórias",
      "Balanço e relatórios do ano",
      "Lembretes de vencimento",
      "Troca de contador sem custo",
      "Plataforma online",
      "Atendimento por WhatsApp, e-mail, telefone e vídeo",
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

/**
 * Every new contract lasts one year and is paid upfront: card (one charge or
 * installments), Pix or boleto. Shorter periods only exist on stored contracts.
 */
export const CONTRACT_PERIOD: BillingPeriod = "ANNUAL";

export function allowedPeriods(_method: PaymentMethod): BillingPeriod[] {
  return [CONTRACT_PERIOD];
}

/** Total charged now, in cents: the annual price, whatever the payment method. */
export function totalPriceCents(plan: PlanId): number {
  return PLANS[plan].annualPriceCents;
}

/** Value of each card installment, in cents (no interest: PLACEHOLDER until Exactra confirms). */
export function installmentCents(plan: PlanId): number {
  return Math.round(PLANS[plan].annualPriceCents / PLANS[plan].maxInstallments);
}

/** Annual price spread per month, used to show how much is left each month. */
export function monthlyEquivalentCents(plan: PlanId): number {
  return Math.round(PLANS[plan].annualPriceCents / PERIOD_MONTHS[CONTRACT_PERIOD]);
}
