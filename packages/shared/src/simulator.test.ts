import { describe, expect, it } from "vitest";
import { allowedPeriods, totalPriceCents } from "./plans.config";
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

  it("always recommends the single plan and flags bigger teams for a quote", () => {
    expect(calculateSimulation({ ...base, employees: "4-10" }).recommendedPlan).toBe("exactra");
    expect(calculateSimulation({ ...base, employees: "4-10" }).needsQuote).toBe(true);
    expect(calculateSimulation(base).needsQuote).toBe(false);
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
  it("card is monthly only; pix/boleto are prepaid", () => {
    expect(allowedPeriods("CARD")).toEqual(["MONTHLY"]);
    expect(allowedPeriods("PIX")).toEqual(["QUARTERLY", "SEMIANNUAL", "ANNUAL"]);
  });

  it("applies the prepaid discount", () => {
    expect(totalPriceCents("exactra", "MONTHLY")).toBe(29900);
    expect(totalPriceCents("exactra", "ANNUAL")).toBeLessThan(29900 * 12);
  });
});
