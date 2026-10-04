import type { AdminContractRow, ContractStatus, PaymentMethod, PlanId } from "@exactra/shared";

/**
 * Admin shapes not yet in @exactra/shared. TODO: move to packages/shared
 * (with the back agent) so the API validates the same contract.
 */

export type AdminPayment = {
  id: string;
  amountCents: number;
  status: "PAID" | "PENDING" | "FAILED" | "REFUNDED";
  method: PaymentMethod;
  paidAt: string | null;
  createdAt: string;
};

/** GET /admin/contracts/:id */
export type AdminContractDetail = AdminContractRow & { amountCents: number; createdAt: string; payments: AdminPayment[] };

/** Row of GET /admin/leads */
export type AdminLeadRow = {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  monthlyRevenue: number;
  recommendedPlan: PlanId;
  utmSource?: string;
  utmCampaign?: string;
  createdAt: string;
};

/** Query of GET /admin/contracts */
export type ContractFilters = { q?: string; status?: ContractStatus; plan?: PlanId; method?: PaymentMethod };
