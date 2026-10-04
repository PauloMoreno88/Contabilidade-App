import {
  BILLING_PERIODS,
  CONTRACT_STATUSES,
  PAYMENT_METHODS,
  PLAN_IDS,
  adminContractRowSchema,
  PERIOD_MONTHS,
  totalPriceCents,
  type AdminContractRow,
  type AdminMetrics,
} from "@exactra/shared";
import type { AdminContractDetail, AdminLeadRow, AdminPayment, ContractFilters } from "./admin-types";

/** Fake admin data, deterministic so screens look the same on every reload. */

const NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Prado", "Fábio Nunes",
  "Gabriela Reis", "Heitor Alves", "Isabela Costa", "João Martins", "Karen Duarte", "Lucas Ferreira",
  "Marina Teixeira", "Nicolas Pires",
];
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 4);
const iso = (t: number) => new Date(t).toISOString();

const contracts: AdminContractDetail[] = NAMES.map((name, i) => {
  const method = PAYMENT_METHODS[i % 3];
  const period = method === "CARD" ? "MONTHLY" : BILLING_PERIODS[1 + (i % 3)];
  const plan = PLAN_IDS[i % 3];
  const status = i % 5 === 4 ? "PENDING_PAYMENT" : i % 7 === 6 ? CONTRACT_STATUSES[1 + (i % 4)] : "ACTIVE";
  const created = NOW - (i * 9 + 2) * DAY;
  const starts = status === "PENDING_PAYMENT" ? null : created + DAY;
  const amountCents = totalPriceCents(plan, period);
  const months = PERIOD_MONTHS[period];
  const payments: AdminPayment[] =
    starts === null
      ? [{ id: `pay_${i}_0`, amountCents, status: "PENDING", method, paidAt: null, createdAt: iso(created) }]
      : Array.from({ length: method === "CARD" ? Math.max(1, Math.floor((NOW - starts) / (30 * DAY)) + 1) : 1 }, (_, n) => ({
          id: `pay_${i}_${n}`,
          amountCents,
          status: "PAID" as const,
          method,
          paidAt: iso(starts + n * 30 * DAY),
          createdAt: iso(starts + n * 30 * DAY),
        }));
  const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(" ", ".");
  return {
    id: `ctr_${String(i + 1).padStart(3, "0")}`,
    customerName: name,
    email: `${slug}@exemplo.com`,
    phone: `2199${String(1000000 + i * 7919).slice(0, 7)}`,
    document: String(10000000000 + i * 123456789).slice(0, 11),
    plan,
    period,
    method,
    status,
    amountCents,
    createdAt: iso(created),
    startsAt: starts === null ? null : iso(starts),
    endsAt: starts === null || method === "CARD" ? null : iso(starts + months * 30 * DAY),
    payments,
  };
});

const leads: AdminLeadRow[] = NAMES.slice(0, 10).map((name, i) => ({
  id: `lead_${i + 1}`,
  name,
  whatsapp: `2198${String(2000000 + i * 4931).slice(0, 7)}`,
  email: i % 2 ? undefined : `${name.split(" ")[0].toLowerCase()}@exemplo.com`,
  monthlyRevenue: [5_000, 10_000, 15_000, 20_000, 30_000, 50_000][i % 6],
  recommendedPlan: PLAN_IDS[i % 3],
  utmSource: i % 3 ? "google" : "instagram",
  utmCampaign: i % 2 ? "lancamento" : undefined,
  createdAt: iso(NOW - i * 2 * DAY),
}));

// zod strips the detail-only keys, and checks the row against the shared contract.
const toRow = (c: AdminContractDetail): AdminContractRow => adminContractRowSchema.parse(c);

export function mockMetrics(): AdminMetrics {
  const active = contracts.filter((c) => c.status === "ACTIVE");
  const count = (key: "plan" | "method") => {
    const acc: Record<string, number> = {};
    for (const c of active) acc[c[key]] = (acc[c[key]] ?? 0) + 1;
    return acc;
  };
  return {
    activeCustomers: active.length,
    newThisMonth: contracts.filter((c) => NOW - Date.parse(c.createdAt) <= 30 * DAY).length,
    contractedRevenueCents: active.reduce((s, c) => s + c.amountCents, 0),
    pendingPayment: contracts.filter((c) => c.status === "PENDING_PAYMENT").length,
    expiringIn30Days: active.filter((c) => c.endsAt && Date.parse(c.endsAt) >= NOW && Date.parse(c.endsAt) - NOW <= 30 * DAY).length,
    byPlan: count("plan"),
    byMethod: count("method"),
  };
}

export function mockContracts(f: ContractFilters): AdminContractRow[] {
  const q = f.q?.trim().toLowerCase();
  return contracts
    .filter(
      (c) =>
        (!q || [c.customerName, c.email, c.document].some((v) => v.toLowerCase().includes(q))) &&
        (!f.status || c.status === f.status) &&
        (!f.plan || c.plan === f.plan) &&
        (!f.method || c.method === f.method),
    )
    .map(toRow);
}

export const mockContract = (id: string) => contracts.find((c) => c.id === id) ?? null;
export const mockLeads = () => leads;
