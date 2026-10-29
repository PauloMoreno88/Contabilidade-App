import {
  activateAccountSchema,
  adminContractDetailSchema,
  adminContractsPageSchema,
  adminCustomerDetailSchema,
  adminCustomersPageSchema,
  adminGuidesSchema,
  adminLeadsPageSchema,
  adminMetricsSchema,
  adminMonthPageSchema,
  checklistItemSchema,
  checklistItemsSchema,
  checkoutResponseSchema,
  contractStatusResponseSchema,
  createLeadResponseSchema,
  createManualCustomerResponseSchema,
  documentsMonthSchema,
  downloadSchema,
  guideParseResultSchema,
  inviteInfoSchema,
  inviteResponseSchema,
  portalCompanySchema,
  portalFileSchema,
  portalGuideSchema,
  portalGuidesSchema,
  portalHomeSchema,
  portalMeSchema,
  portalPlanSchema,
  renewResponseSchema,
  uploadTicketSchema,
  type ActivateAccountInput,
  type AdminContractsQuery,
  type AdminCustomersQuery,
  type AdminLeadsQuery,
  type AdminMonthQuery,
  type CreateCheckoutInput,
  type CreateGuideInput,
  type CreateLeadInput,
  type CreateManualCustomerInput,
  type CreateUploadInput,
  type MarkGuidePaidInput,
  type OnboardingInput,
  type RejectDocumentInput,
  type RenewInput,
  type UpdateCompanyInput,
  type UpdateCustomerInput,
  type UploadTicket,
  type UpsertChecklistItemInput,
} from "@exactra/shared";
import { z } from "zod";
import { emailRecipientsSchema, bulkEmailResultSchema, type BulkEmailInput } from "@exactra/shared";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; query?: object; session?: boolean };

/** Builds `?a=1&b=2`, skipping empty values. */
function qs(query: object = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function send(path: string, { method = "GET", body, query, session }: Options) {
  const res = await fetch(`${BASE_URL}${path}${qs(query)}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Admin and customer routes rely on the Better Auth session cookie shared between www. and api.
    credentials: session ? "include" : "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    // Validation errors (400) carry an object in `message`; only plain strings are shown to people.
    throw new ApiError(res.status, typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res;
}

/** Fetches JSON and validates it against the shared contract. */
async function json<S extends z.ZodTypeAny>(schema: S, path: string, opts: Options = {}): Promise<z.infer<S>> {
  return schema.parse(await (await send(path, opts)).json());
}

export const httpApi = {
  adminEmailRecipients: () => json(emailRecipientsSchema, "/admin/emails/recipients", { session: true }),
  adminSendEmail: (input: BulkEmailInput) => json(bulkEmailResultSchema, "/admin/emails", { method: "POST", body: input, session: true }),
  createLead: (input: CreateLeadInput) => json(createLeadResponseSchema, "/leads", { method: "POST", body: input }),

  createCheckout: (input: CreateCheckoutInput) => json(checkoutResponseSchema, "/checkout/sessions", { method: "POST", body: input }),

  getContractStatus: (contractId: string, token: string) =>
    json(contractStatusResponseSchema, `/contracts/${encodeURIComponent(contractId)}/status`, { query: { token } }),

  adminMetrics: () => json(adminMetricsSchema, "/admin/metrics", { session: true }),

  adminContracts: (query: AdminContractsQuery = {}) => json(adminContractsPageSchema, "/admin/contracts", { query, session: true }),

  adminContract: (id: string) => json(adminContractDetailSchema, `/admin/contracts/${encodeURIComponent(id)}`, { session: true }),

  adminLeads: (query: AdminLeadsQuery = {}) => json(adminLeadsPageSchema, "/admin/leads", { query, session: true }),

  /** CSV with the same filters as the table (pagination is ignored by the API). */
  adminContractsCsv: async (query: AdminContractsQuery = {}) => (await send("/admin/contracts.csv", { query, session: true })).blob(),
};

const ok = z.object({}).passthrough();
const s = { session: true } as const;
const enc = encodeURIComponent;

/** Customer area (/app) and its admin side. Every call carries the session cookie. */
export const portalHttpApi = {
  inviteInfo: (token: string) => json(inviteInfoSchema, "/account/invite", { query: { token } }),
  activateAccount: (input: ActivateAccountInput) => json(ok, "/account/activate", { method: "POST", body: activateAccountSchema.parse(input) }),

  me: () => json(portalMeSchema, "/app/me", s),
  onboarding: (input: OnboardingInput) => json(ok, "/app/onboarding", { method: "POST", body: input, ...s }),
  home: () => json(portalHomeSchema, "/app/home", s),
  documents: (competence?: string) => json(documentsMonthSchema, "/app/documents", { query: { competence }, ...s }),
  createUpload: (input: CreateUploadInput) => json(uploadTicketSchema, "/app/uploads", { method: "POST", body: input, ...s }),
  completeUpload: (fileId: string) => json(portalFileSchema, `/app/uploads/${enc(fileId)}/complete`, { method: "POST", ...s }),
  deleteFile: async (fileId: string) => void (await send(`/app/files/${enc(fileId)}`, { method: "DELETE", ...s })),
  fileUrl: (fileId: string, inline = false) => json(downloadSchema, `/app/files/${enc(fileId)}/download`, { query: { inline: inline ? 1 : undefined }, ...s }),
  /** The ZIP streams from the API with the session cookie: open it as a plain link. */
  zipUrl: (competence: string) => `${BASE_URL}/app/files.zip?competence=${enc(competence)}`,
  guides: () => json(portalGuidesSchema, "/app/guides", s),
  markGuidePaid: (id: string, input: MarkGuidePaidInput) => json(portalGuideSchema, `/app/guides/${enc(id)}/paid`, { method: "POST", body: input, ...s }),
  unmarkGuidePaid: (id: string) => json(portalGuideSchema, `/app/guides/${enc(id)}/paid`, { method: "DELETE", ...s }),
  plan: () => json(portalPlanSchema, "/app/plan", s),
  renew: (input: RenewInput) => json(renewResponseSchema, "/app/plan/renew", { method: "POST", body: input, ...s }),
  company: () => json(portalCompanySchema, "/app/company", s),
  updateCompany: (input: UpdateCompanyInput) => json(portalCompanySchema, "/app/company", { method: "PATCH", body: input, ...s }),

  adminMonth: (query: AdminMonthQuery = {}) => json(adminMonthPageSchema, "/admin/month", { query, ...s }),
  adminCustomers: (query: AdminCustomersQuery = {}) => json(adminCustomersPageSchema, "/admin/customers", { query, ...s }),
  adminCustomer: (id: string) => json(adminCustomerDetailSchema, `/admin/customers/${enc(id)}`, s),
  adminCreateCustomer: (input: CreateManualCustomerInput) =>
    json(createManualCustomerResponseSchema, "/admin/customers", { method: "POST", body: input, ...s }),
  adminUpdateCustomer: (id: string, input: UpdateCustomerInput) =>
    json(adminCustomerDetailSchema, `/admin/customers/${enc(id)}`, { method: "PATCH", body: input, ...s }),
  adminInvite: (id: string) => json(inviteResponseSchema, `/admin/customers/${enc(id)}/invite`, { method: "POST", ...s }),
  adminDocuments: (id: string, competence?: string) => json(documentsMonthSchema, `/admin/customers/${enc(id)}/documents`, { query: { competence }, ...s }),
  adminReject: (requestId: string, input: RejectDocumentInput) =>
    json(ok, `/admin/document-requests/${enc(requestId)}/reject`, { method: "POST", body: input, ...s }),
  adminFileUrl: (fileId: string, inline = false) =>
    json(downloadSchema, `/admin/files/${enc(fileId)}/download`, { query: { inline: inline ? 1 : undefined }, ...s }),
  adminCreateUpload: (input: CreateUploadInput) => json(uploadTicketSchema, "/admin/uploads", { method: "POST", body: input, ...s }),
  adminCompleteUpload: (fileId: string) => json(portalFileSchema, `/admin/uploads/${enc(fileId)}/complete`, { method: "POST", ...s }),
  adminParseGuide: (fileId: string) => json(guideParseResultSchema, "/admin/guides/parse", { method: "POST", body: { fileId }, ...s }),
  adminCreateGuide: (input: CreateGuideInput) => json(z.object({ id: z.string() }), "/admin/guides", { method: "POST", body: input, ...s }),
  adminDeleteGuide: async (id: string) => void (await send(`/admin/guides/${enc(id)}`, { method: "DELETE", ...s })),
  adminGuides: (customerId: string) => json(adminGuidesSchema, `/admin/customers/${enc(customerId)}/guides`, s),
  adminChecklistItems: () => json(checklistItemsSchema, "/admin/checklist-items", s),
  adminCreateChecklistItem: (input: UpsertChecklistItemInput) => json(checklistItemSchema, "/admin/checklist-items", { method: "POST", body: input, ...s }),
  adminUpdateChecklistItem: (id: string, input: Partial<UpsertChecklistItemInput>) =>
    json(checklistItemSchema, `/admin/checklist-items/${enc(id)}`, { method: "PATCH", body: input, ...s }),

  /**
   * PUT straight to the storage (R2) with the signed URL. XHR instead of fetch for upload progress.
   * No cookies: the URL itself is the permission.
   */
  putFile(ticket: UploadTicket, file: Blob, onProgress?: (fraction: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(ticket.method, ticket.url);
      for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, "upload failed")));
      xhr.onerror = () => reject(new ApiError(0, "network"));
      xhr.send(file);
    });
  },
};

export const allHttpApi = { ...httpApi, ...portalHttpApi };
export type Api = typeof allHttpApi;
