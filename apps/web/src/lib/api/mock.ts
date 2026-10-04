import {
  createCheckoutSchema,
  createLeadSchema,
  type CheckoutResponse,
  type ContractStatus,
  type ContractStatusResponse,
  type CreateCheckoutInput,
  type CreateLeadInput,
} from "@exactra/shared";

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
};
