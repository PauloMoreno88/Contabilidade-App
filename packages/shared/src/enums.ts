export const PLAN_IDS = ["essencial", "profissional", "empresarial"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const PAYMENT_METHODS = ["CARD", "PIX", "BOLETO"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CONTRACT_STATUSES = [
  "PENDING_PAYMENT",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const PERIOD_MONTHS: Record<BillingPeriod, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};
