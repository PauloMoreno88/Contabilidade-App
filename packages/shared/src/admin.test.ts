import { describe, expect, it } from "vitest";
import { adminContractDetailSchema, adminContractsQuerySchema } from "./admin";
import { calculateSimulation } from "./simulator";

const answers = { profile: "servicos", monthlyRevenue: 15_000, hasCnpj: true, employees: "none", currentRegime: "mei" } as const;

describe("admin schemas", () => {
  it("parses a contract detail as the API serializes it and strips internal fields", () => {
    const lead = {
      id: "l1", name: "Ana", whatsapp: "21999990000", email: null, answers, result: calculateSimulation(answers),
      rulesVersion: "placeholder-0", utm: { source: "google" }, consentAt: "2026-10-01T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z",
    };
    const detail = adminContractDetailSchema.parse({
      id: "c1", customerId: "cu1", plan: "profissional", period: "MONTHLY", method: "CARD", amountCents: 39900, status: "ACTIVE",
      statusToken: "secret", stripeSessionId: "cs_1", stripeSubscriptionId: null, expiryNoticeSentAt: null,
      startsAt: "2026-10-02T00:00:00.000Z", endsAt: null, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z",
      customer: {
        id: "cu1", name: "Ana", email: "ana@x.com", phone: "21999990000", document: "12345678909", stripeCustomerId: null,
        consentAt: "2026-10-01T00:00:00.000Z", leadId: "l1", createdAt: "2026-10-01T00:00:00.000Z", lead,
      },
      payments: [{ id: "p1", contractId: "c1", amountCents: 39900, status: "PAID", method: "CARD", stripePaymentIntentId: null, stripeInvoiceId: "in_1", paidAt: "2026-10-02T00:00:00.000Z", createdAt: "2026-10-02T00:00:00.000Z" }],
    });
    expect(detail).not.toHaveProperty("statusToken");
    expect(detail.customer.lead?.answers.monthlyRevenue).toBe(15_000);
  });

  it("coerces query strings with page defaults", () => {
    expect(adminContractsQuerySchema.parse({ page: "2", status: "ACTIVE" })).toEqual({ page: 2, pageSize: 20, status: "ACTIVE" });
  });
});
