import { z } from "zod";
import { PLANS, PlanConfig } from "./plans.config";
import { PLAN_IDS, PlanId } from "./enums";

/**
 * PLACEHOLDER rules. NOT real tax rules: the accountant must provide the real
 * ones (see docs/perguntas-contador.md, section B). Bump RULES_VERSION whenever
 * the rules change so stored leads stay traceable.
 */
export const RULES_VERSION = "placeholder-0";

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

export const simulatorResultSchema = z.object({
  rulesVersion: z.string(),
  suggestedRegime: z.string(),
  estimatedTaxMinCents: z.number().int(),
  estimatedTaxMaxCents: z.number().int(),
  estimatedNetCents: z.number().int(),
  recommendedPlan: z.enum(PLAN_IDS),
  disclaimer: z.string(),
  isPlaceholder: z.boolean(),
});
export type SimulatorResult = z.infer<typeof simulatorResultSchema>;

export function recommendPlan(a: SimulatorAnswers): PlanId {
  if (a.employees === "4-10" || a.employees === "10+" || a.monthlyRevenue >= 40_000) return "empresarial";
  if (a.employees === "1-3" || a.monthlyRevenue >= 12_000) return "profissional";
  return "essencial";
}

/** PLACEHOLDER calculation: flat fictional rates. Replace with the accountant's rules. */
export function calculateSimulation(answers: SimulatorAnswers): SimulatorResult {
  const revenueCents = Math.round(answers.monthlyRevenue * 100);
  const min = Math.round(revenueCents * 0.06);
  const max = Math.round(revenueCents * 0.11);
  return {
    rulesVersion: RULES_VERSION,
    suggestedRegime: "Simples Nacional (simulação)",
    estimatedTaxMinCents: min,
    estimatedTaxMaxCents: max,
    estimatedNetCents: revenueCents - Math.round((min + max) / 2),
    recommendedPlan: recommendPlan(answers),
    disclaimer: SIMULATOR_DISCLAIMER,
    isPlaceholder: true,
  };
}

export function getRecommendedPlan(answers: SimulatorAnswers): PlanConfig {
  return PLANS[recommendPlan(answers)];
}
