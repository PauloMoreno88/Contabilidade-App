import {
  adminContractDetailSchema,
  adminContractsPageSchema,
  adminLeadsPageSchema,
  adminMetricsSchema,
  checkoutResponseSchema,
  contractStatusResponseSchema,
  createLeadResponseSchema,
  type AdminContractsQuery,
  type AdminLeadsQuery,
  type CreateCheckoutInput,
  type CreateLeadInput,
} from "@exactra/shared";
import type { z } from "zod";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST"; body?: unknown; query?: object; session?: boolean };

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
    // Admin routes rely on the Better Auth session cookie shared between www. and api.
    credentials: session ? "include" : "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new ApiError(res.status, err?.message ?? res.statusText);
  }
  return res;
}

/** Fetches JSON and validates it against the shared contract. */
async function json<S extends z.ZodTypeAny>(schema: S, path: string, opts: Options = {}): Promise<z.infer<S>> {
  return schema.parse(await (await send(path, opts)).json());
}

export const httpApi = {
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

export type Api = typeof httpApi;
