import { z } from "zod";
import { BILLING_PERIODS, CONTRACT_STATUSES, PAYMENT_METHODS, STORED_PLAN_IDS, type ContractStatus } from "./enums";
import { parseBarcodeLine } from "./barcode";

/**
 * Customer area ("área do cliente", /app): rules, enums and the HTTP contract
 * between apps/web and apps/api. Decisions in docs/plano.md (24–30).
 */

// ---------- Rules (PLACEHOLDER until the accountant answers issue #62) ----------

export const PORTAL_RULES = {
  /** Documents of month M are due on this day of month M+1. PLACEHOLDER */
  documentsDueDay: 10,
  /** Reminder e-mails for pending documents, in days before the due date (0 = on the day). PLACEHOLDER */
  documentReminderDaysBefore: [5, 1, 0],
  /** Reminder e-mails for open guides, in days before the due date. */
  guideReminderDaysBefore: [3, 0],
  /** "Renovar" shows up this many days before the contract ends. PLACEHOLDER */
  renewWindowDays: 60,
  /** After the contract ends the account is read-only for this many days, then blocked. PLACEHOLDER */
  readOnlyDays: 90,
  /** Files are deleted this many months after the end of their competence (user decision, 23/10/2026). */
  retentionMonths: 12,
  /** The customer is warned this many days before files are deleted. */
  retentionNoticeDays: 30,
  /** Activation link lifetime. */
  inviteDays: 7,
  /** Upload limit per file. */
  maxUploadBytes: 25 * 1024 * 1024,
} as const;

/** Accepted uploads: extension → content type stored and served back. */
export const UPLOAD_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  xml: "application/xml",
  ofx: "application/x-ofx",
  csv: "text/csv",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  txt: "text/plain",
};

export const fileExtension = (fileName: string) => (fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "");

/** Content type from the extension, never from the browser. null when the type is not accepted. */
export const uploadContentType = (fileName: string): string | null => UPLOAD_TYPES[fileExtension(fileName)] ?? null;

// ---------- Competence ("2026-10" = documents and taxes of October 2026) ----------

export const competenceSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "competência no formato AAAA-MM");
/** Date only, "2026-11-20". */
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const SP = "America/Sao_Paulo";

/** Today in São Paulo as "YYYY-MM-DD". */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SP, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addMonthsToCompetence(competence: string, months: number): string {
  const [y, m] = competence.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Competence whose documents are being collected now: last month. */
export function currentDocumentsCompetence(now: Date = new Date()): string {
  return addMonthsToCompetence(todayInSaoPaulo(now).slice(0, 7), -1);
}

/** Due date of a competence's documents. */
export function documentsDueDate(competence: string): string {
  return `${addMonthsToCompetence(competence, 1)}-${String(PORTAL_RULES.documentsDueDay).padStart(2, "0")}`;
}

/** First day on which a competence's files are deleted (start of the month after retentionMonths full months). */
export function retentionDeletionDate(competence: string): string {
  return `${addMonthsToCompetence(competence, PORTAL_RULES.retentionMonths + 1)}-01`;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "outubro de 2026" */
export function competenceLabel(competence: string): string {
  const [y, m] = competence.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** "out/2026" */
export const competenceShort = (competence: string) => {
  const [y, m] = competence.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)}/${y}`;
};

/** Whole days from today (São Paulo) to a date-only string. Negative when it is past. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const today = Date.parse(`${todayInSaoPaulo(now)}T00:00:00Z`);
  return Math.round((Date.parse(`${date}T00:00:00Z`) - today) / 86400_000);
}

// ---------- Access (who can do what, from the company's contracts) ----------

export const ACCESS_LEVELS = ["FULL", "READ_ONLY", "PENDING", "BLOCKED"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export interface AccessContract {
  status: ContractStatus;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  updatedAt: Date | string;
}

export interface Access {
  level: AccessLevel;
  /** End of the current contract (FULL) or of the last one (READ_ONLY). */
  endsAt: string | null;
  /** READ_ONLY: when the account becomes BLOCKED. */
  readOnlyUntil: string | null;
}

const iso = (d: Date | string) => new Date(d).toISOString();

/**
 * FULL while a contract is ACTIVE or PAST_DUE (legacy card subscriptions keep access while Stripe retries).
 * READ_ONLY for PORTAL_RULES.readOnlyDays after the last contract that ever started ended.
 * PENDING when only a payment is pending (boleto). BLOCKED otherwise.
 */
export function customerAccess(contracts: AccessContract[], now: Date = new Date()): Access {
  const current = contracts.filter((c) => c.status === "ACTIVE" || c.status === "PAST_DUE");
  if (current.length) {
    const ends = current.map((c) => (c.endsAt ? Date.parse(iso(c.endsAt)) : Infinity));
    const max = Math.max(...ends);
    return { level: "FULL", endsAt: Number.isFinite(max) ? new Date(max).toISOString() : null, readOnlyUntil: null };
  }
  const ended = contracts
    .filter((c) => (c.status === "EXPIRED" || c.status === "CANCELED") && c.startsAt)
    .map((c) => Date.parse(iso(c.endsAt ?? c.updatedAt)));
  if (ended.length) {
    const last = Math.max(...ended);
    const until = last + PORTAL_RULES.readOnlyDays * 86400_000;
    if (now.getTime() < until) {
      return { level: "READ_ONLY", endsAt: new Date(last).toISOString(), readOnlyUntil: new Date(until).toISOString() };
    }
  }
  if (contracts.some((c) => c.status === "PENDING_PAYMENT")) return { level: "PENDING", endsAt: null, readOnlyUntil: null };
  return { level: "BLOCKED", endsAt: null, readOnlyUntil: null };
}

/** Renewal opens renewWindowDays before the end, and stays open after it ends. */
export function canRenew(access: Access, now: Date = new Date()): boolean {
  if (access.level === "READ_ONLY" || access.level === "BLOCKED") return true;
  if (access.level !== "FULL" || !access.endsAt) return false;
  return Date.parse(access.endsAt) - now.getTime() <= PORTAL_RULES.renewWindowDays * 86400_000;
}

// ---------- Enums ----------

export const MEMBER_ROLES = ["OWNER", "MEMBER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const CONTRACT_SOURCES = ["CHECKOUT", "MANUAL"] as const;
export type ContractSource = (typeof CONTRACT_SOURCES)[number];

export const DOCUMENT_REQUEST_STATUSES = ["PENDING", "SENT", "REJECTED"] as const;
export type DocumentRequestStatus = (typeof DOCUMENT_REQUEST_STATUSES)[number];

export const GUIDE_TYPES = ["DAS", "DARF", "FGTS", "INSS", "ISS", "ICMS", "IRPF", "OTHER"] as const;
export type GuideType = (typeof GUIDE_TYPES)[number];

export const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  DAS: "DAS (Simples Nacional)",
  DARF: "DARF (impostos federais)",
  FGTS: "FGTS",
  INSS: "INSS (GPS)",
  ISS: "ISS (prefeitura)",
  ICMS: "ICMS (estado)",
  IRPF: "Imposto de Renda",
  OTHER: "Outra guia",
};

/** Computed from paidAt and the due date, never stored. */
export const GUIDE_STATUSES = ["OPEN", "PAID", "OVERDUE"] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

export function guideStatus(g: { paidAt: string | Date | null; dueDate: string }, now: Date = new Date()): GuideStatus {
  if (g.paidAt) return "PAID";
  return daysUntil(g.dueDate, now) < 0 ? "OVERDUE" : "OPEN";
}

/** PLACEHOLDER: the accountant lists the usual reasons (issue #62). */
export const REJECTION_REASONS = {
  incomplete: "Documento incompleto (faltam páginas ou dias do mês)",
  illegible: "Arquivo ilegível ou cortado",
  wrong_period: "Documento de outro mês",
  wrong_document: "Não é o documento pedido",
  other: "Outro motivo",
} as const;
export type RejectionReason = keyof typeof REJECTION_REASONS;
const rejectionReasonKeys = Object.keys(REJECTION_REASONS) as [RejectionReason, ...RejectionReason[]];

// ---------- Company profile (onboarding) → monthly checklist ----------

export const ACTIVITIES = ["servicos", "comercio", "ambos"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const companyProfileSchema = z.object({
  activity: z.enum(ACTIVITIES),
  hasEmployees: z.boolean(),
  /** Banks the company uses (free text, one statement per bank each month). */
  banks: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  /** How invoices are issued (city system, Emissor Nacional…). */
  invoiceSystem: z.string().trim().max(120).optional(),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/** Which profiles a checklist item applies to. Empty = every company. */
export const checklistAppliesToSchema = z
  .object({
    activities: z.array(z.enum(ACTIVITIES)).optional(),
    hasEmployees: z.boolean().optional(),
  })
  .default({});
export type ChecklistAppliesTo = z.infer<typeof checklistAppliesToSchema>;

export function itemApplies(appliesTo: ChecklistAppliesTo, profile: CompanyProfile | null): boolean {
  // Without a profile only the items for everyone apply.
  if (!profile) return !appliesTo.activities?.length && appliesTo.hasEmployees === undefined;
  if (appliesTo.activities?.length && !appliesTo.activities.includes(profile.activity)) return false;
  if (appliesTo.hasEmployees !== undefined && appliesTo.hasEmployees !== profile.hasEmployees) return false;
  return true;
}

/** Whether an item is already asked for in a competence (it starts in that month or before; null = always). */
export const itemStarted = (startsCompetence: string | null, competence: string) => !startsCompetence || startsCompetence <= competence;

// ---------- Customer area responses (/app/*) ----------

export const portalFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  uploadedAt: z.string(),
  /** Who sent it: the customer or the Exactra team. */
  uploadedBy: z.enum(["customer", "exactra"]),
  canDelete: z.boolean(),
});
export type PortalFile = z.infer<typeof portalFileSchema>;

const accessSchema = z.object({
  level: z.enum(ACCESS_LEVELS),
  endsAt: z.string().nullable(),
  readOnlyUntil: z.string().nullable(),
});

/** GET /app/me */
export const portalMeSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string(), twoFactorEnabled: z.boolean() }),
  company: z
    .object({ id: z.string(), name: z.string(), document: z.string(), email: z.string(), phone: z.string() })
    .nullable(),
  access: accessSchema,
  /** false until the first-access steps are done (or skipped). */
  onboarded: z.boolean(),
});
export type PortalMe = z.infer<typeof portalMeSchema>;

/** POST /app/onboarding */
export const onboardingInputSchema = z.object({
  phone: z.string().min(10).max(20),
  profile: companyProfileSchema.optional(),
  /** Manual customers never accepted the terms at checkout. */
  acceptTerms: z.literal(true),
});
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export const documentRequestSchema = z.object({
  id: z.string(),
  competence: competenceSchema,
  title: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  dueDate: dateOnlySchema,
  status: z.enum(DOCUMENT_REQUEST_STATUSES),
  rejection: z.object({ reason: z.enum(rejectionReasonKeys), note: z.string().nullable(), at: z.string() }).nullable(),
  files: z.array(portalFileSchema),
});
export type DocumentRequest = z.infer<typeof documentRequestSchema>;

/** GET /app/documents?competence= (also returned to the admin for one customer) */
export const documentsMonthSchema = z.object({
  competence: competenceSchema,
  dueDate: dateOnlySchema,
  requests: z.array(documentRequestSchema),
  /** "Outros documentos": free uploads for the month. */
  others: z.array(portalFileSchema),
  /** Competences with something to show, newest first. */
  competences: z.array(competenceSchema),
  /** When this month's files are deleted (retention). */
  deletesOn: dateOnlySchema,
});
export type DocumentsMonth = z.infer<typeof documentsMonthSchema>;

export const UPLOAD_PURPOSES = ["document", "receipt", "guide"] as const;

/** POST /app/uploads and POST /admin/uploads: asks for a signed upload URL. */
export const createUploadSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    /** document: the checklist item; omitted = "Outros documentos". */
    requestId: z.string().optional(),
    /** receipt: the guide paid. */
    guideId: z.string().optional(),
    /** admin only: whose file it is. */
    customerId: z.string().optional(),
    competence: competenceSchema.optional(),
    fileName: z.string().trim().min(1).max(200),
    sizeBytes: z.number().int().positive().max(PORTAL_RULES.maxUploadBytes),
  })
  .refine((u) => uploadContentType(u.fileName) !== null, { message: "Tipo de arquivo não aceito", path: ["fileName"] });
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export const uploadTicketSchema = z.object({
  fileId: z.string(),
  url: z.string().url(),
  method: z.literal("PUT"),
  /** Headers the browser must send with the PUT. */
  headers: z.record(z.string(), z.string()),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/** GET /app/files/:id/download and /admin/files/:id/download */
export const downloadSchema = z.object({ url: z.string().url() });

export const portalGuideSchema = z.object({
  id: z.string(),
  type: z.enum(GUIDE_TYPES),
  /** Shown instead of the type label when set ("ISS de setembro – Niterói"). */
  label: z.string().nullable(),
  competence: competenceSchema,
  amountCents: z.number().int(),
  dueDate: dateOnlySchema,
  /** Only digits; null when the guide has no checked line (then only the PDF is offered). */
  barcode: z.string().nullable(),
  status: z.enum(GUIDE_STATUSES),
  paidAt: z.string().nullable(),
  publishedAt: z.string(),
  file: portalFileSchema,
  receipt: portalFileSchema.nullable(),
});
export type PortalGuide = z.infer<typeof portalGuideSchema>;

/** GET /app/guides */
export const portalGuidesSchema = z.object({
  /** OPEN and OVERDUE, by due date. */
  open: z.array(portalGuideSchema),
  /** PAID, newest first. */
  paid: z.array(portalGuideSchema),
});
export type PortalGuides = z.infer<typeof portalGuidesSchema>;

/** POST /app/guides/:id/paid */
export const markGuidePaidSchema = z.object({ receiptFileId: z.string().optional() });
export type MarkGuidePaidInput = z.infer<typeof markGuidePaidSchema>;

/** Home ("Início"): what to do now, most urgent first. */
export const portalTaskSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("onboarding") }),
  z.object({
    kind: z.literal("guide"),
    guideId: z.string(),
    type: z.enum(GUIDE_TYPES),
    label: z.string().nullable(),
    amountCents: z.number().int(),
    dueDate: dateOnlySchema,
    status: z.enum(["OPEN", "OVERDUE"]),
  }),
  z.object({ kind: z.literal("rejected"), requestId: z.string(), competence: competenceSchema, title: z.string(), reason: z.enum(rejectionReasonKeys) }),
  z.object({ kind: z.literal("documents"), competence: competenceSchema, pending: z.number().int(), total: z.number().int(), dueDate: dateOnlySchema }),
  z.object({ kind: z.literal("renew"), endsAt: z.string().nullable() }),
  z.object({ kind: z.literal("retention"), competence: competenceSchema, deletesOn: dateOnlySchema }),
]);
export type PortalTask = z.infer<typeof portalTaskSchema>;

/** GET /app/home */
export const portalHomeSchema = z.object({
  tasks: z.array(portalTaskSchema),
  documents: z.object({ competence: competenceSchema, sent: z.number().int(), total: z.number().int(), dueDate: dateOnlySchema }),
  guides: z.object({ open: z.number().int(), openAmountCents: z.number().int(), nextDueDate: dateOnlySchema.nullable() }),
  /** Last guides published, for the "Últimas guias" strip. */
  recentGuides: z.array(portalGuideSchema),
});
export type PortalHome = z.infer<typeof portalHomeSchema>;

export const portalPaymentSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(["PENDING", "PAID", "FAILED"]),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export const portalContractSchema = z.object({
  id: z.string(),
  plan: z.enum(STORED_PLAN_IDS),
  period: z.enum(BILLING_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  amountCents: z.number().int(),
  status: z.enum(CONTRACT_STATUSES),
  source: z.enum(CONTRACT_SOURCES),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
  payments: z.array(portalPaymentSchema),
});
export type PortalContract = z.infer<typeof portalContractSchema>;

/** GET /app/plan */
export const portalPlanSchema = z.object({
  access: accessSchema,
  canRenew: z.boolean(),
  /** Newest first; the first one that started is the current one. */
  contracts: z.array(portalContractSchema),
});
export type PortalPlan = z.infer<typeof portalPlanSchema>;

/** POST /app/plan/renew → a new Stripe Checkout for the same company. */
export const renewInputSchema = z.object({ method: z.enum(PAYMENT_METHODS), consent: z.literal(true) });
export type RenewInput = z.infer<typeof renewInputSchema>;
export const renewResponseSchema = z.object({ checkoutUrl: z.string().url(), contractId: z.string(), statusToken: z.string() });

/** GET /app/company */
export const portalCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string(),
  email: z.string(),
  phone: z.string(),
  profile: companyProfileSchema.nullable(),
  remindersEnabled: z.boolean(),
  members: z.array(z.object({ name: z.string(), email: z.string(), role: z.enum(MEMBER_ROLES), you: z.boolean() })),
});
export type PortalCompany = z.infer<typeof portalCompanySchema>;

/** PATCH /app/company. Name and CPF/CNPJ only change through the Exactra team. */
export const updateCompanySchema = z.object({
  phone: z.string().min(10).max(20).optional(),
  profile: companyProfileSchema.optional(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ---------- Activation (public, from the invite e-mail) ----------

/** GET /account/invite?token= */
export const inviteInfoSchema = z.object({ email: z.string(), name: z.string(), companyName: z.string().nullable() });
export type InviteInfo = z.infer<typeof inviteInfoSchema>;

/** POST /account/activate */
export const activateAccountSchema = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) });
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;

// ---------- Guide publishing (admin) ----------

/** POST /admin/guides/parse: what the PDF says, to pre-fill the form. Nothing is published. */
export const guideParseResultSchema = z.object({
  /** false for scanned PDFs (no text layer): everything must be typed. */
  hasText: z.boolean(),
  barcode: z.string().nullable(),
  /** Amount encoded in the line, in cents. */
  barcodeAmountCents: z.number().int().nullable(),
  /** The line's amount is also printed in the PDF (check 1 of decision 25). */
  amountMatchesText: z.boolean(),
  dueDate: dateOnlySchema.nullable(),
  competence: competenceSchema.nullable(),
  type: z.enum(GUIDE_TYPES).nullable(),
  /** CPF/CNPJ numbers found in the PDF and whether the customer's is one of them. */
  documentsFound: z.array(z.string()),
  documentMatches: z.boolean().nullable(),
  warnings: z.array(z.string()),
});
export type GuideParseResult = z.infer<typeof guideParseResultSchema>;

/** POST /admin/guides. A line is optional, but when present it must be valid and carry the same amount. */
export const createGuideSchema = z
  .object({
    customerId: z.string(),
    fileId: z.string(),
    type: z.enum(GUIDE_TYPES),
    label: z.string().trim().max(80).optional(),
    competence: competenceSchema,
    amountCents: z.number().int().positive(),
    dueDate: dateOnlySchema,
    barcode: z.string().max(80).optional(),
  })
  .superRefine((g, ctx) => {
    if (!g.barcode) return;
    const info = parseBarcodeLine(g.barcode);
    if (!info?.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["barcode"], message: "Linha digitável inválida" });
    } else if (info.amountCents !== null && info.amountCents !== g.amountCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amountCents"], message: "O valor não bate com o da linha digitável" });
    }
  });
export type CreateGuideInput = z.infer<typeof createGuideSchema>;

/** POST /admin/document-requests/:id/reject */
export const rejectDocumentSchema = z.object({ reason: z.enum(rejectionReasonKeys), note: z.string().trim().max(500).optional() });
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>;
