import { z } from "zod";
import { BILLING_PERIODS, CONTRACT_STATUSES, PAYMENT_METHODS, PLAN_IDS } from "./enums";
import { simulatorAnswersSchema, simulatorResultSchema } from "./simulator";

export const utmSchema = z
  .object({
    source: z.string(),
    medium: z.string(),
    campaign: z.string(),
    term: z.string(),
    content: z.string(),
  })
  .partial();

/** POST /leads */
export const createLeadSchema = z.object({
  name: z.string().min(2).max(120),
  whatsapp: z.string().min(10).max(20),
  email: z.string().email().optional(),
  answers: simulatorAnswersSchema,
  result: simulatorResultSchema,
  utm: utmSchema.optional(),
  consent: z.literal(true),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/** Response of POST /leads. The API recomputes `result` with the current rules. */
export const createLeadResponseSchema = z.object({ id: z.string(), result: simulatorResultSchema });
export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;

/** POST /checkout/sessions */
export const createCheckoutSchema = z.object({
  plan: z.enum(PLAN_IDS),
  period: z.enum(BILLING_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  customer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    document: z.string().min(11).max(18), // CPF or CNPJ
  }),
  leadId: z.string().optional(),
  consent: z.literal(true),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const checkoutResponseSchema = z.object({
  contractId: z.string(),
  checkoutUrl: z.string().url(),
  statusToken: z.string(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

/** GET /contracts/:id/status?token=... */
export const contractStatusResponseSchema = z.object({
  contractId: z.string(),
  status: z.enum(CONTRACT_STATUSES),
  method: z.enum(PAYMENT_METHODS),
  plan: z.enum(PLAN_IDS),
  period: z.enum(BILLING_PERIODS),
});
export type ContractStatusResponse = z.infer<typeof contractStatusResponseSchema>;

/** GET /admin/metrics */
export const adminMetricsSchema = z.object({
  activeCustomers: z.number().int(),
  newThisMonth: z.number().int(),
  contractedRevenueCents: z.number().int(),
  pendingPayment: z.number().int(),
  expiringIn30Days: z.number().int(),
  byPlan: z.record(z.string(), z.number().int()),
  byMethod: z.record(z.string(), z.number().int()),
});
export type AdminMetrics = z.infer<typeof adminMetricsSchema>;

/** Row of GET /admin/contracts */
export const adminContractRowSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  email: z.string(),
  phone: z.string(),
  document: z.string(),
  plan: z.enum(PLAN_IDS),
  period: z.enum(BILLING_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(CONTRACT_STATUSES),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});
export type AdminContractRow = z.infer<typeof adminContractRowSchema>;
