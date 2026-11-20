import { describe, expect, it } from "vitest";
import { allowedPeriods, CURRENT_PLAN, installmentCents, monthlyEquivalentCents, planInfo, totalPriceCents } from "./plans.config";
import { bestRegime, calculateSimulation, estimateRegimes, getRecommendedPlan, recommendPlan, RULES_VERSION, simulatorAnswersSchema } from "./simulator";

const base = {
  profile: "servicos",
  monthlyRevenue: 15_000,
  hasCnpj: false,
  employees: "none",
  currentRegime: "autonomo",
} as const;

describe("simulator (placeholder rules)", () => {
  it("flags results as placeholder with the rules version", () => {
    const r = calculateSimulation(simulatorAnswersSchema.parse(base));
    expect(r.isPlaceholder).toBe(true);
    expect(r.rulesVersion).toBe(RULES_VERSION);
    expect(r.estimatedTaxMinCents).toBeLessThanOrEqual(r.estimatedTaxMaxCents);
  });

  it("always recommends the single plan, whatever the team size", () => {
    expect(calculateSimulation({ ...base, employees: "10+" }).recommendedPlan).toBe("exactra");
    expect(calculateSimulation({ ...base, employees: "10+" }).needsQuote).toBeUndefined();
  });

  it("picks the cheapest applicable regime", () => {
    const r = calculateSimulation({ ...base, monthlyRevenue: 30_000 });
    const applicable = r.regimes!.filter((x) => x.applicable);
    expect(r.regimes!.find((x) => x.name === "MEI")!.applicable).toBe(false);
    expect(r.estimatedTaxMinCents).toBe(Math.min(...applicable.map((x) => x.taxCents)));
    expect(r.suggestedRegime).toBe(applicable.find((x) => x.taxCents === r.estimatedTaxMinCents)!.name);
    expect(r.estimatedNetCents).toBe(30_000_00 - r.estimatedTaxMinCents);
  });

  it("offers MEI only under the yearly limit", () => {
    const small = calculateSimulation({ ...base, monthlyRevenue: 5_000 });
    expect(small.suggestedRegime).toBe("MEI");
  });
});

describe("plans", () => {
  it("sells only the one-year contract, for every payment method", () => {
    expect(allowedPeriods("CARD")).toEqual(["ANNUAL"]);
    expect(allowedPeriods("PIX")).toEqual(["ANNUAL"]);
    expect(allowedPeriods("BOLETO")).toEqual(["ANNUAL"]);
  });

  it("charges the annual price, split in up to 12 card installments", () => {
    expect(totalPriceCents("exactra")).toBe(358800);
    expect(installmentCents("exactra")).toBe(29900);
    expect(monthlyEquivalentCents("exactra")).toBe(29900);
  });
});

describe("regime comparison (placeholder rules)", () => {
  const names = (a: Parameters<typeof estimateRegimes>[0]) => estimateRegimes(a).map((r) => r.name);

  it("services compare the Simples with and without Fator R", () => {
    expect(names(base)).toEqual(["MEI", "Simples com Fator R", "Simples sem Fator R", "Lucro Presumido"]);
  });

  it("commerce has a single Simples line", () => {
    expect(names({ ...base, profile: "comercio" })).toEqual(["MEI", "Simples Nacional", "Lucro Presumido"]);
  });

  it("MEI only applies within the revenue limit, up to 3 employees and outside liberal professions", () => {
    const mei = (a: Partial<typeof base> | Record<string, unknown>) => estimateRegimes({ ...base, ...a } as typeof base)[0];
    expect(mei({ monthlyRevenue: 6_750 })).toMatchObject({ applicable: true, taxCents: 7600 });
    expect(mei({ monthlyRevenue: 6_751 })).toMatchObject({ applicable: false, taxCents: 0 });
    expect(mei({ monthlyRevenue: 5_000, employees: "4-10" }).applicable).toBe(false);
    expect(mei({ monthlyRevenue: 5_000, profile: "liberal" }).applicable).toBe(false);
    expect(mei({ monthlyRevenue: 5_000, profile: "empresa" }).applicable).toBe(false);
  });

  it("picks the cheapest regime that applies", () => {
    expect(bestRegime(estimateRegimes({ ...base, monthlyRevenue: 5_000 })).name).toBe("MEI");
    expect(bestRegime(estimateRegimes(base)).name).toBe("Simples com Fator R");
    expect(
      bestRegime([
        { name: "MEI", taxCents: 0, applicable: false },
        { name: "B", taxCents: 500, applicable: true },
        { name: "C", taxCents: 300, applicable: true },
      ]).name,
    ).toBe("C");
  });

  it("every simulation recommends the single plan", () => {
    expect(recommendPlan(base)).toBe(CURRENT_PLAN.id);
    expect(getRecommendedPlan({ ...base, profile: "empresa", employees: "10+" })).toBe(CURRENT_PLAN);
  });
});

describe("planInfo", () => {
  it("names current and legacy plans", () => {
    expect(planInfo("exactra").name).toBe(CURRENT_PLAN.name);
    expect(planInfo("essencial")).toEqual({ name: "Essencial (antigo)", tagline: "" });
  });
});
