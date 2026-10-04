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
    expect(r.estimatedTaxMinCents).toBeLessThan(r.estimatedTaxMaxCents);
  });

  it("recommends a bigger plan with employees", () => {
    expect(calculateSimulation({ ...base, employees: "4-10" }).recommendedPlan).toBe("empresarial");
    expect(calculateSimulation({ ...base, monthlyRevenue: 5_000 }).recommendedPlan).toBe("essencial");
  });
});

describe("plans", () => {
  it("card is monthly only; pix/boleto are prepaid", () => {
    expect(allowedPeriods("CARD")).toEqual(["MONTHLY"]);
    expect(allowedPeriods("PIX")).toEqual(["QUARTERLY", "SEMIANNUAL", "ANNUAL"]);
  });

  it("applies the prepaid discount", () => {
    expect(totalPriceCents("essencial", "MONTHLY")).toBe(19900);
    expect(totalPriceCents("essencial", "ANNUAL")).toBeLessThan(19900 * 12);
  });
});
