import { z } from "zod";
import { BILLING_PERIODS, CONTRACT_STATUSES, PAYMENT_METHODS, PLAN_IDS } from "./enums";
import { adminContractRowSchema, utmSchema } from "./schemas";
import { simulatorAnswersSchema, simulatorResultSchema } from "./simulator";

/**
 * Admin contract, mirroring what apps/api/src/admin.controller.ts returns
 * (Prisma rows serialized to JSON: dates are ISO strings). Unknown keys are
 * stripped on parse, so internal fields (statusToken, Stripe ids) never
 * need to be modeled here.
 */

/** Wraps a row schema in the `{ items, total, page, pageSize }` envelope of the list routes. */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });

const pageQuery = {
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** Query of GET /admin/contracts and GET /admin/contracts.csv */
export const adminContractsQuerySchema = z.object({
  ...pageQuery,
  status: z.enum(CONTRACT_STATUSES).optional(),
  plan: z.enum(PLAN_IDS).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  period: z.enum(BILLING_PERIODS).optional(),
});
export type AdminContractsQuery = z.input<typeof adminContractsQuerySchema>;

/** Query of GET /admin/leads */
export const adminLeadsQuerySchema = z.object(pageQuery);
export type AdminLeadsQuery = z.input<typeof adminLeadsQuerySchema>;

/** GET /admin/contracts */
export const adminContractsPageSchema = paginated(adminContractRowSchema);
export type AdminContractsPage = z.infer<typeof adminContractsPageSchema>;

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const adminPaymentSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  amountCents: z.number().int(),
  status: z.enum(PAYMENT_STATUSES),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;

/** Lead row (GET /admin/leads) and the lead nested in a contract's customer. */
export const adminLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  whatsapp: z.string(),
  email: z.string().nullable(),
  answers: simulatorAnswersSchema,
  result: simulatorResultSchema,
  rulesVersion: z.string(),
  utm: utmSchema.nullable(),
  consentAt: z.string(),
  createdAt: z.string(),
});
export type AdminLead = z.infer<typeof adminLeadSchema>;

/** GET /admin/leads */
export const adminLeadsPageSchema = paginated(adminLeadSchema);
export type AdminLeadsPage = z.infer<typeof adminLeadsPageSchema>;

/** GET /admin/contracts/:id */
export const adminContractDetailSchema = z.object({
  id: z.string(),
  plan: z.enum(PLAN_IDS),
  period: z.enum(BILLING_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  amountCents: z.number().int(),
  status: z.enum(CONTRACT_STATUSES),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    document: z.string(),
    consentAt: z.string(),
    createdAt: z.string(),
    lead: adminLeadSchema.nullable(),
  }),
  payments: z.array(adminPaymentSchema),
});
export type AdminContractDetail = z.infer<typeof adminContractDetailSchema>;
