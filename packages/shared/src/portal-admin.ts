import { z } from "zod";
import { BILLING_PERIODS, CONTRACT_STATUSES, PAYMENT_METHODS, STORED_PLAN_IDS } from "./enums";
import { paginated } from "./admin";
import {
  ACCESS_LEVELS,
  checklistAppliesToSchema,
  companyProfileSchema,
  competenceSchema,
  CONTRACT_SOURCES,
  dateOnlySchema,
  MEMBER_ROLES,
  portalGuideSchema,
} from "./portal";

/** Admin side of the customer area: month overview, customer file, guides and checklist. */

const pageQuery = {
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
};

// ---------- Month overview ("Visão do mês") ----------

export const MONTH_FILTERS = ["all", "late", "rejected", "unpaid", "no_access"] as const;
export type MonthFilter = (typeof MONTH_FILTERS)[number];

/** GET /admin/month */
export const adminMonthQuerySchema = z.object({
  ...pageQuery,
  competence: competenceSchema.optional(),
  filter: z.enum(MONTH_FILTERS).default("all"),
});
export type AdminMonthQuery = z.input<typeof adminMonthQuerySchema>;

export const adminMonthRowSchema = z.object({
  customerId: z.string(),
  name: z.string(),
  document: z.string(),
  access: z.enum(ACCESS_LEVELS),
  /** Someone activated a login for this company. */
  hasLogin: z.boolean(),
  /** Invite sent and not used yet. */
  invitePending: z.boolean(),
  onboarded: z.boolean(),
  docsSent: z.number().int(),
  docsRequired: z.number().int(),
  docsRejected: z.number().int(),
  guidesPublished: z.number().int(),
  /** Past due and not reported as paid. */
  guidesOverdue: z.number().int(),
  lastSeenAt: z.string().nullable(),
});
export type AdminMonthRow = z.infer<typeof adminMonthRowSchema>;

export const adminMonthPageSchema = paginated(adminMonthRowSchema).extend({
  competence: competenceSchema,
  dueDate: dateOnlySchema,
  totals: z.object({
    customers: z.number().int(),
    /** Every required document of the month was sent. */
    complete: z.number().int(),
    /** Past the due date with required documents missing. */
    late: z.number().int(),
    rejected: z.number().int(),
    guidesOverdue: z.number().int(),
    noAccess: z.number().int(),
  }),
});
export type AdminMonthPage = z.infer<typeof adminMonthPageSchema>;

// ---------- Customers ----------

/** GET /admin/customers */
export const adminCustomersQuerySchema = z.object(pageQuery);
export type AdminCustomersQuery = z.input<typeof adminCustomersQuerySchema>;

export const adminCustomerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  document: z.string(),
  access: z.enum(ACCESS_LEVELS),
  hasLogin: z.boolean(),
  invitePending: z.boolean(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminCustomerRow = z.infer<typeof adminCustomerRowSchema>;
export const adminCustomersPageSchema = paginated(adminCustomerRowSchema);
export type AdminCustomersPage = z.infer<typeof adminCustomersPageSchema>;

export const adminMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(MEMBER_ROLES),
  activated: z.boolean(),
  inviteSentAt: z.string().nullable(),
  inviteExpiresAt: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
});
export type AdminMember = z.infer<typeof adminMemberSchema>;

export const checklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  appliesTo: checklistAppliesToSchema,
  active: z.boolean(),
  sortOrder: z.number().int(),
  /** null = template for every company; set = extra item of one company. */
  customerId: z.string().nullable(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/** GET /admin/customers/:id */
export const adminCustomerDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  document: z.string(),
  createdAt: z.string(),
  onboardedAt: z.string().nullable(),
  remindersEnabled: z.boolean(),
  profile: companyProfileSchema.nullable(),
  access: z.object({ level: z.enum(ACCESS_LEVELS), endsAt: z.string().nullable(), readOnlyUntil: z.string().nullable() }),
  members: z.array(adminMemberSchema),
  contracts: z.array(
    z.object({
      id: z.string(),
      plan: z.enum(STORED_PLAN_IDS),
      period: z.enum(BILLING_PERIODS),
      method: z.enum(PAYMENT_METHODS),
      status: z.enum(CONTRACT_STATUSES),
      source: z.enum(CONTRACT_SOURCES),
      amountCents: z.number().int(),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
    }),
  ),
  /** Template items turned off for this company. */
  disabledItemIds: z.array(z.string()),
  /** Items that apply to this company this month: templates (after the profile filter) and its own extras. */
  checklist: z.array(checklistItemSchema.extend({ applies: z.boolean(), disabled: z.boolean() })),
});
export type AdminCustomerDetail = z.infer<typeof adminCustomerDetailSchema>;

/** POST /admin/customers: a customer who did not come through the checkout (decision 28). */
export const createManualCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().min(10).max(20),
    document: z.string().min(11).max(18),
    startsAt: dateOnlySchema,
    endsAt: dateOnlySchema,
    /** What the customer pays outside the site (for the records). 0 when unknown. */
    amountCents: z.number().int().min(0).default(0),
    sendInvite: z.boolean().default(true),
  })
  .refine((c) => c.endsAt > c.startsAt, { message: "O fim precisa ser depois do início", path: ["endsAt"] });
export type CreateManualCustomerInput = z.input<typeof createManualCustomerSchema>;
export const createManualCustomerResponseSchema = z.object({ id: z.string() });

/** PATCH /admin/customers/:id */
export const updateCustomerSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  profile: companyProfileSchema.nullable().optional(),
  disabledItemIds: z.array(z.string()).max(100).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/** POST /admin/customers/:id/invite: creates the login if needed and (re)sends the activation e-mail. */
export const inviteResponseSchema = z.object({ email: z.string(), expiresAt: z.string() });

// ---------- Guides ----------

/** GET /admin/customers/:id/guides */
export const adminGuidesSchema = z.array(portalGuideSchema.extend({ publishedBy: z.string().nullable() }));
export type AdminGuide = z.infer<typeof adminGuidesSchema>[number];

// ---------- Checklist templates ----------

/** POST /admin/checklist-items, PATCH /admin/checklist-items/:id */
export const upsertChecklistItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).nullable().optional(),
  required: z.boolean().default(true),
  appliesTo: checklistAppliesToSchema,
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(100),
  /** Set to create an extra item for one company. */
  customerId: z.string().nullable().optional(),
});
export type UpsertChecklistItemInput = z.input<typeof upsertChecklistItemSchema>;
export const checklistItemsSchema = z.array(checklistItemSchema);
