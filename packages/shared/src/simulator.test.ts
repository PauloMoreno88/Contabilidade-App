import { describe, expect, it } from "vitest";
import { allowedPeriods, installmentCents, monthlyEquivalentCents, totalPriceCents } from "./plans.config";
import { calculateSimulation, RULES_VERSION, simulatorAnswersSchema } from "./simulator";

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
