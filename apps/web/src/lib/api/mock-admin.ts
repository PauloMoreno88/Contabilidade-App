import {
  adminContractRowSchema,
  BILLING_PERIODS,
  calculateSimulation,
  CONTRACT_STATUSES,
  PAYMENT_METHODS,
  PERIOD_MONTHS,
  PLAN_IDS,
  RULES_VERSION,
  totalPriceCents,
  type AdminContractDetail,
  type AdminContractsPage,
  type AdminContractsQuery,
  type AdminLead,
  type AdminLeadsPage,
  type AdminLeadsQuery,
  type AdminMetrics,
  type AdminPayment,
  type SimulatorAnswers,
} from "@exactra/shared";

/** Fake admin data in the API's shapes, deterministic so screens look the same on every reload. */

const NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Prado", "Fábio Nunes",
  "Gabriela Reis", "Heitor Alves", "Isabela Costa", "João Martins", "Karen Duarte", "Lucas Ferreira",
  "Marina Teixeira", "Nicolas Pires",
];
const REVENUES = [5_000, 10_000, 15_000, 20_000, 30_000, 50_000];
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 4);
const iso = (t: number) => new Date(t).toISOString();

const leads: AdminLead[] = NAMES.slice(0, 10).map((name, i) => {
  const answers: SimulatorAnswers = {
    profile: "servicos",
    monthlyRevenue: REVENUES[i % 6],
    hasCnpj: i % 2 === 0,
    employees: i % 4 === 3 ? "1-3" : "none",
    currentRegime: "nao-sei",
  };
  return {
    id: `lead_${i + 1}`,
    name,
    whatsapp: `2198${String(2000000 + i * 4931).slice(0, 7)}`,
    email: i % 2 ? null : `${name.split(" ")[0].toLowerCase()}@exemplo.com`,
    answers,
    result: calculateSimulation(answers),
    rulesVersion: RULES_VERSION,
    utm: i % 3 ? { source: "google", campaign: i % 2 ? "lancamento" : undefined } : { source: "instagram" },
    consentAt: iso(NOW - i * 2 * DAY),
    createdAt: iso(NOW - i * 2 * DAY),
  };
});

const contracts: AdminContractDetail[] = NAMES.map((name, i) => {
  const method = PAYMENT_METHODS[i % 3];
  const period = method === "CARD" ? "MONTHLY" : BILLING_PERIODS[1 + (i % 3)];
  const plan = PLAN_IDS[i % 3];
  const status = i % 5 === 4 ? "PENDING_PAYMENT" : i % 7 === 6 ? CONTRACT_STATUSES[1 + (i % 4)] : "ACTIVE";
  const created = NOW - (i * 9 + 2) * DAY;
  const starts = status === "PENDING_PAYMENT" ? null : created + DAY;
  const amountCents = totalPriceCents(plan, period);
  const id = `ctr_${String(i + 1).padStart(3, "0")}`;
  const payment = (n: number, at: number | null): AdminPayment => ({
    id: `pay_${i}_${n}`,
    contractId: id,
    amountCents,
    status: at === null ? "PENDING" : "PAID",
    method,
    paidAt: at === null ? null : iso(at),
    createdAt: iso(at ?? created),
  });
  const payments =
    starts === null
      ? [payment(0, null)]
      : Array.from({ length: method === "CARD" ? Math.floor((NOW - starts) / (30 * DAY)) + 1 : 1 }, (_, n) =>
          payment(n, starts + n * 30 * DAY),
        ).reverse();
  const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(" ", ".");
  return {
    id,
    plan,
    period,
    method,
    amountCents,
    status,
    startsAt: starts === null ? null : iso(starts),
    endsAt: starts === null || method === "CARD" ? null : iso(starts + PERIOD_MONTHS[period] * 30 * DAY),
    createdAt: iso(created),
    updatedAt: iso(created),
    customer: {
      id: `cus_${i + 1}`,
      name,
      email: `${slug}@exemplo.com`,
      phone: `2199${String(1000000 + i * 7919).slice(0, 7)}`,
      document: String(10000000000 + i * 123456789).slice(0, 11),
      consentAt: iso(created),
      createdAt: iso(created),
      lead: leads[i] ?? null,
    },
    payments,
  };
});

const page = <T>(all: T[], q: { page?: number; pageSize?: number }) => {
  const p = q.page ?? 1;
  const size = q.pageSize ?? 20;
  return { items: all.slice((p - 1) * size, p * size), total: all.length, page: p, pageSize: size };
};
const has = (q: string | undefined, ...values: (string | null)[]) =>
  !q?.trim() || values.some((v) => v?.toLowerCase().includes(q.trim().toLowerCase()));

function filtered(f: AdminContractsQuery) {
  return contracts.filter(
    (c) =>
      has(f.q, c.customer.name, c.customer.email, c.customer.document, c.customer.phone) &&
      (!f.status || c.status === f.status) &&
      (!f.plan || c.plan === f.plan) &&
      (!f.method || c.method === f.method) &&
      (!f.period || c.period === f.period),
  );
}

const toRow = (c: AdminContractDetail) =>
  adminContractRowSchema.parse({
    ...c,
    customerName: c.customer.name,
    email: c.customer.email,
    phone: c.customer.phone,
    document: c.customer.document,
  });

export function mockMetrics(): AdminMetrics {
  const active = contracts.filter((c) => c.status === "ACTIVE");
  const count = (key: "plan" | "method") => {
    const acc: Record<string, number> = {};
    for (const c of active) acc[c[key]] = (acc[c[key]] ?? 0) + 1;
    return acc;
  };
  return {
    activeCustomers: active.length,
    newThisMonth: contracts.filter((c) => c.startsAt && Date.parse(c.startsAt) >= Date.UTC(2026, 9, 1)).length,
    contractedRevenueCents: active.reduce((s, c) => s + c.amountCents, 0),
    pendingPayment: contracts.filter((c) => c.status === "PENDING_PAYMENT").length,
    expiringIn30Days: active.filter((c) => c.method !== "CARD" && c.endsAt && Date.parse(c.endsAt) - NOW <= 30 * DAY).length,
    byPlan: count("plan"),
    byMethod: count("method"),
  };
}

export const mockContracts = (f: AdminContractsQuery): AdminContractsPage => page(filtered(f).map(toRow), f);
export const mockContract = (id: string) => contracts.find((c) => c.id === id) ?? null;
export const mockLeads = (f: AdminLeadsQuery): AdminLeadsPage => page(leads.filter((l) => has(f.q, l.name, l.email, l.whatsapp)), f);

/** Same layout as the API's CSV: BOM, ";" separator, pt-BR decimals. */
export function mockContractsCsv(f: AdminContractsQuery): Blob {
  const cell = (v: string | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Cliente", "E-mail", "Telefone", "CPF/CNPJ", "Plano", "Período", "Pagamento", "Status", "Valor (R$)", "Início", "Fim"];
  const lines = filtered(f).map((c) =>
    [
      c.customer.name,
      c.customer.email,
      c.customer.phone,
      c.customer.document,
      c.plan,
      c.period,
      c.method,
      c.status,
      (c.amountCents / 100).toFixed(2).replace(".", ","),
      c.startsAt?.slice(0, 10) ?? "",
      c.endsAt?.slice(0, 10) ?? "",
    ]
      .map(cell)
      .join(";"),
  );
  return new Blob(["﻿" + [header.map(cell).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
}
