import {
  createCheckoutSchema,
  createLeadSchema,
  type CheckoutResponse,
  type ContractStatus,
  type ContractStatusResponse,
  type CreateCheckoutInput,
  type CreateLeadInput,
  type AdminContractRow,
  type AdminMetrics,
} from "@exactra/shared";
import type { AdminContractDetail, AdminLeadRow, ContractFilters } from "./admin-types";
import { mockContract, mockContracts, mockLeads, mockMetrics } from "./mock-admin";

/**
 * In-browser stand-in for apps/api. Validates input with the same zod schemas
 * the API uses, so a payload that passes here should pass there too.
 * Contracts live in sessionStorage so the status page can read them after the
 * fake "Stripe" redirect.
 */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

type MockContract = { input: CreateCheckoutInput; token: string; polls: number };
const contractKey = (contractId: string) => `mock-contract:${contractId}`;

/** Fake webhook: card and Pix confirm after a couple of polls; boleto stays pending. */
function mockStatus(c: MockContract): ContractStatus {
  if (c.input.method === "BOLETO") return "PENDING_PAYMENT";
  return c.polls >= 2 ? "ACTIVE" : "PENDING_PAYMENT";
}

export const mockApi = {
  async createLead(input: CreateLeadInput): Promise<{ id: string }> {
    createLeadSchema.parse(input);
    await delay();
    return { id: id("lead") };
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResponse> {
    createCheckoutSchema.parse(input);
    await delay(800);
    const contractId = id("ctr");
    const token = id("tok");
    sessionStorage.setItem(contractKey(contractId), JSON.stringify({ input, token, polls: 0 } satisfies MockContract));
    // The real API returns the Stripe Checkout URL; Stripe then redirects to this same status page.
    const checkoutUrl = `${window.location.origin}/checkout/status?contract=${contractId}&token=${token}`;
    return { contractId, checkoutUrl, statusToken: token };
  },

  async getContractStatus(contractId: string, token: string): Promise<ContractStatusResponse> {
    await delay(300);
    const raw = sessionStorage.getItem(contractKey(contractId));
    const c = raw ? (JSON.parse(raw) as MockContract) : null;
    if (!c || c.token !== token) throw new Error("Contract not found");
    c.polls++;
    sessionStorage.setItem(contractKey(contractId), JSON.stringify(c));
    const { plan, period, method } = c.input;
    return { contractId, status: mockStatus(c), plan, period, method };
  },

  // Admin (real API requires an admin session cookie).
  async adminMetrics(): Promise<AdminMetrics> {
    await delay(300);
    return mockMetrics();
  },

  async adminContracts(filters: ContractFilters = {}): Promise<AdminContractRow[]> {
    await delay(300);
    return mockContracts(filters);
  },

  async adminContract(contractId: string): Promise<AdminContractDetail> {
    await delay(300);
    const c = mockContract(contractId);
    if (!c) throw new Error("Contract not found");
    return c;
  },

  async adminLeads(): Promise<AdminLeadRow[]> {
    await delay(300);
    return mockLeads();
  },

  /** GET /admin/contracts.csv with the same filters as the table. */
  async adminContractsCsv(filters: ContractFilters = {}): Promise<Blob> {
    await delay(300);
    const rows = mockContracts(filters);
    const header = Object.keys(rows[0] ?? { id: "" });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header.join(","), ...rows.map((r) => header.map((k) => esc(r[k as keyof AdminContractRow])).join(","))].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  },
};
