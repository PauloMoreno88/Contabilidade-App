import { z } from "zod";
import { CURRENT_PLAN, PlanConfig } from "./plans.config";
import { PlanId, STORED_PLAN_IDS } from "./enums";

/**
 * PLACEHOLDER rules. NOT real tax rules: the accountant must provide the real
 * ones (see docs/perguntas-contador.md, section B). Bump RULES_VERSION whenever
 * the rules change so stored leads stay traceable.
 */
export const RULES_VERSION = "placeholder-1";

export const SIMULATOR_DISCLAIMER =
  "Esta é uma estimativa. O enquadramento tributário definitivo depende da análise do contador.";

export const simulatorAnswersSchema = z.object({
  profile: z.enum(["servicos", "liberal", "comercio", "empresa", "primeiro-cnpj"]),
  monthlyRevenue: z.number().min(0).max(10_000_000),
  hasCnpj: z.boolean(),
  employees: z.enum(["none", "1-3", "4-10", "10+"]),
  currentRegime: z.enum(["clt", "autonomo", "mei", "simples", "presumido", "nao-sei"]),
});
export type SimulatorAnswers = z.infer<typeof simulatorAnswersSchema>;

/** One line of the regime comparison shown in the result. */
export const regimeEstimateSchema = z.object({
  name: z.string(),
  taxCents: z.number().int(),
  applicable: z.boolean(),
  /** Why the regime does not apply, when it does not. */
  note: z.string().optional(),
});
export type RegimeEstimate = z.infer<typeof regimeEstimateSchema>;

export const simulatorResultSchema = z.object({
  rulesVersion: z.string(),
  suggestedRegime: z.string(),
  estimatedTaxMinCents: z.number().int(),
  estimatedTaxMaxCents: z.number().int(),
  estimatedNetCents: z.number().int(),
  // Stored leads may carry a plan sold before decision 20.
  recommendedPlan: z.enum(STORED_PLAN_IDS),
  disclaimer: z.string(),
  isPlaceholder: z.boolean(),
  // Optional: leads stored with rules "placeholder-0" do not have them.
  regimes: z.array(regimeEstimateSchema).optional(),
  /** Only on leads stored before decision 22, when bigger teams got a custom quote. */
  needsQuote: z.boolean().optional(),
});
export type SimulatorResult = z.infer<typeof simulatorResultSchema>;

/** A single plan on sale: every simulation recommends it. */
export function recommendPlan(_answers: SimulatorAnswers): PlanId {
  return CURRENT_PLAN.id;
}

/** PLACEHOLDER monthly DAS of a MEI, in cents. */
const MEI_MONTHLY_CENTS = 7600;
/** PLACEHOLDER annual revenue limit of a MEI, in BRL. */
const MEI_ANNUAL_LIMIT = 81_000;

/**
 * PLACEHOLDER comparison: flat fictional rates per regime. Replace with the
 * accountant's rules (annex, Fator R, ISS by city, real brackets).
 */
export function estimateRegimes(a: SimulatorAnswers): RegimeEstimate[] {
  const revenueCents = Math.round(a.monthlyRevenue * 100);
  const services = a.profile !== "comercio";
  const meiApplicable =
    a.monthlyRevenue * 12 <= MEI_ANNUAL_LIMIT &&
    (a.employees === "none" || a.employees === "1-3") &&
    a.profile !== "liberal" &&
    a.profile !== "empresa";
  const at = (rate: number) => Math.round(revenueCents * rate);

  const regimes: RegimeEstimate[] = [
    meiApplicable
      ? { name: "MEI", taxCents: MEI_MONTHLY_CENTS, applicable: true }
      : { name: "MEI", taxCents: 0, applicable: false, note: "Só até R$ 81 mil por ano" },
    { name: services ? "Simples com Fator R" : "Simples Nacional", taxCents: at(services ? 0.06 : 0.04), applicable: true },
  ];
  if (services) regimes.push({ name: "Simples sem Fator R", taxCents: at(0.155), applicable: true });
  regimes.push({ name: "Lucro Presumido", taxCents: at(services ? 0.1633 : 0.1133), applicable: true });
  return regimes;
}

/** Cheapest regime that applies. */
export function bestRegime(regimes: RegimeEstimate[]): RegimeEstimate {
  return regimes.filter((r) => r.applicable).reduce((best, r) => (r.taxCents < best.taxCents ? r : best));
}

/** PLACEHOLDER calculation. Replace with the accountant's rules. */
export function calculateSimulation(answers: SimulatorAnswers): SimulatorResult {
  const revenueCents = Math.round(answers.monthlyRevenue * 100);
  const regimes = estimateRegimes(answers);
  const best = bestRegime(regimes);
  return {
    rulesVersion: RULES_VERSION,
    suggestedRegime: best.name,
    estimatedTaxMinCents: best.taxCents,
    estimatedTaxMaxCents: best.taxCents,
    estimatedNetCents: revenueCents - best.taxCents,
    recommendedPlan: recommendPlan(answers),
    disclaimer: SIMULATOR_DISCLAIMER,
    isPlaceholder: true,
    regimes,
  };
}

export function getRecommendedPlan(_answers: SimulatorAnswers): PlanConfig {
  return CURRENT_PLAN;
}
