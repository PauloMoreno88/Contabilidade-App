import {
  calculateSimulation,
  createCheckoutSchema,
  createLeadSchema,
  type AdminContractsQuery,
  type AdminLeadsQuery,
  type ContractStatus,
  type CreateCheckoutInput,
  type CreateLeadInput,
} from "@exactra/shared";
import { ApiError, type Api } from "./http";
import { mockContract, mockContracts, mockContractsCsv, mockLeads, mockMetrics } from "./mock-admin";

/**
 * In-browser stand-in for apps/api, enabled with NEXT_PUBLIC_USE_MOCK=true.
 * Validates input with the same zod schemas the API uses. Contracts live in
 * sessionStorage so the status page can read them after the fake "Stripe" redirect.
 */

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

type MockContract = { input: CreateCheckoutInput; token: string; polls: number };
const contractKey = (contractId: string) => `mock-contract:${contractId}`;

/** Fake webhook: card and Pix confirm after a couple of polls; boleto stays pending. */
function mockStatus(c: MockContract): ContractStatus {
  if (c.input.method === "BOLETO") return "PENDING_PAYMENT";
  return c.polls >= 2 ? "ACTIVE" : "PENDING_PAYMENT";
}

export const mockApi: Api = {
  async createLead(input: CreateLeadInput) {
    createLeadSchema.parse(input);
    await delay();
    return { id: id("lead"), result: calculateSimulation(input.answers) };
  },

  async createCheckout(input: CreateCheckoutInput) {
    createCheckoutSchema.parse(input);
    await delay(800);
    const contractId = id("ctr");
    const token = id("tok");
    sessionStorage.setItem(contractKey(contractId), JSON.stringify({ input, token, polls: 0 } satisfies MockContract));
    // The real API returns the Stripe Checkout URL; Stripe then redirects to this same status page.
    const checkoutUrl = `${window.location.origin}/checkout/status?contract=${contractId}&token=${token}`;
    return { contractId, checkoutUrl, statusToken: token };
  },

  async getContractStatus(contractId: string, token: string) {
    await delay(300);
    const raw = sessionStorage.getItem(contractKey(contractId));
    const c = raw ? (JSON.parse(raw) as MockContract) : null;
    if (!c || c.token !== token) throw new ApiError(404, "Not Found");
    c.polls++;
    sessionStorage.setItem(contractKey(contractId), JSON.stringify(c));
    const { plan, period, method } = c.input;
    return { contractId, status: mockStatus(c), plan, period, method };
  },

  async adminMetrics() {
    await delay(300);
    return mockMetrics();
  },

  async adminContracts(query: AdminContractsQuery = {}) {
    await delay(300);
    return mockContracts(query);
  },

  async adminContract(contractId: string) {
    await delay(300);
    const c = mockContract(contractId);
    if (!c) throw new ApiError(404, "Not Found");
    return c;
  },

  async adminLeads(query: AdminLeadsQuery = {}) {
    await delay(300);
    return mockLeads(query);
  },

  async adminContractsCsv(query: AdminContractsQuery = {}) {
    await delay(300);
    return mockContractsCsv(query);
  },
};
