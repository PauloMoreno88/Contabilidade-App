"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import {
  CONTRACT_STATUSES,
  PAYMENT_METHODS,
  PLAN_IDS,
  PLANS,
  type AdminMetrics,
  type ContractStatus,
  type PaymentMethod,
  type PlanId,
} from "@exactra/shared";
import { adminCopy, statusLabels } from "@/config/admin";
import { methodLabels } from "@/config/checkout";
import { api } from "@/lib/api";
import type { ContractFilters } from "@/lib/api/admin-types";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { useLoad } from "./useLoad";

const copy = adminCopy;

export function Dashboard() {
  const metrics = useLoad(() => api.adminMetrics(), []);
  return (
    <>
      {metrics.error && <p className="mb-6 text-brand">{copy.loadError}</p>}
      {metrics.data && <MetricsView m={metrics.data} />}
      <ContractsTable />
    </>
  );
}

function MetricsView({ m }: { m: AdminMetrics }) {
  const cards: [string, string][] = [
    [copy.metrics.activeCustomers, String(m.activeCustomers)],
    [copy.metrics.newThisMonth, String(m.newThisMonth)],
    [copy.metrics.contractedRevenueCents, formatBRL(m.contractedRevenueCents)],
    [copy.metrics.pendingPayment, String(m.pendingPayment)],
    [copy.metrics.expiringIn30Days, String(m.expiringIn30Days)],
  ];
  return (
    <section className="mb-10">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-surface p-4 last:col-span-2 md:last:col-span-1">
            <dt className="text-[0.78rem] text-faint">{label}</dt>
            <dd className="mt-1 font-mono text-[1.5rem] font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Breakdown title={copy.metrics.byPlan} rows={PLAN_IDS.map((id) => [PLANS[id].name, m.byPlan[id] ?? 0])} />
        <Breakdown title={copy.metrics.byMethod} rows={PAYMENT_METHODS.map((id) => [methodLabels[id].label, m.byMethod[id] ?? 0])} />
      </div>
    </section>
  );
}

/** Horizontal bars; a chart library would be overkill for 3 rows. */
function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <h2 className="mb-3 text-[0.9rem] font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <li key={label} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-[0.84rem]">
            <span className="truncate text-muted">{label}</span>
            <span className="h-2 overflow-hidden rounded bg-surface-3">
              <span className="block h-full rounded bg-brand" style={{ width: `${(value / max) * 100}%` }} />
            </span>
            <span className="text-right font-mono tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContractsTable() {
  const c = copy.contracts;
  const [filters, setFilters] = useState<ContractFilters>({});
  const [exporting, setExporting] = useState(false);
  const rows = useLoad(() => api.adminContracts(filters), [JSON.stringify(filters)]);
  const set = <K extends keyof ContractFilters>(k: K, v: string) => setFilters((f) => ({ ...f, [k]: v || undefined }));

  async function exportCsv() {
    setExporting(true);
    const blob = await api.adminContractsCsv(filters);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = c.csvName;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
  }

  const select = "rounded-lg border border-line bg-surface px-3 py-2 text-[0.88rem]";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.3rem] font-semibold">{c.title}</h1>
        <button type="button" onClick={exportCsv} disabled={exporting} className="btn btn-ghost px-4 py-2 text-[0.88rem]">
          <Download size={16} aria-hidden="true" />
          {c.exportCsv}
        </button>
      </div>

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{c.search}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input type="search" placeholder={c.search} className="field-input bg-surface py-2 pl-9" onChange={(e) => set("q", e.target.value)} />
        </label>
        <select aria-label={c.allStatuses} className={select} onChange={(e) => set("status", e.target.value as ContractStatus)}>
          <option value="">{c.allStatuses}</option>
          {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select aria-label={c.allPlans} className={select} onChange={(e) => set("plan", e.target.value as PlanId)}>
          <option value="">{c.allPlans}</option>
          {PLAN_IDS.map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
        </select>
        <select aria-label={c.allMethods} className={select} onChange={(e) => set("method", e.target.value as PaymentMethod)}>
          <option value="">{c.allMethods}</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{methodLabels[m].label}</option>)}
        </select>
      </div>

      {rows.error && <p className="text-brand">{copy.loadError}</p>}
      {!rows.data && !rows.error && <p className="text-muted">{copy.loading}</p>}
      {rows.data?.length === 0 && <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{c.empty}</p>}
      {!!rows.data?.length && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-faint">
              <tr>
                {Object.values(c.cols).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/admin/contrato?id=${r.id}`} className="font-medium hover:text-brand">{r.customerName}</Link>
                    <div className="text-[0.78rem] text-faint">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">{PLANS[r.plan].name}</td>
                  <td className="px-4 py-3">{methodLabels[r.method].label}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatDate(r.startsAt)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatDate(r.endsAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
