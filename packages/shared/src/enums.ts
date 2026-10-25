/** Plans on sale. A single plan since 20/10/2026 (docs/plano.md, decision 20). */
export const PLAN_IDS = ["exactra"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Plans sold before decision 20. They only appear on stored contracts and leads. */
export const LEGACY_PLAN_IDS = ["essencial", "profissional", "empresarial"] as const;

/** Every plan id that can come back from the database. */
export const STORED_PLAN_IDS = [...PLAN_IDS, ...LEGACY_PLAN_IDS] as const;
export type StoredPlanId = (typeof STORED_PLAN_IDS)[number];

export const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const CHECKOUT_PAYMENT_METHODS = ["CARD", "PIX", "BOLETO"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
export const PAYMENT_METHODS = [...CHECKOUT_PAYMENT_METHODS, "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROVIDERS = ["STRIPE", "MERCADO_PAGO"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

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
