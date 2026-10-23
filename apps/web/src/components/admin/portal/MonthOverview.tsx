"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { addMonthsToCompetence, competenceLabel, currentDocumentsCompetence, MONTH_FILTERS, type AdminMonthQuery, type AdminMonthRow, type MonthFilter } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { accessLabels, adminPortalCopy } from "@/config/admin-portal";
import { api } from "@/lib/api";
import { formatDate, formatDay, formatDocument } from "@/lib/format";
import { Pager } from "../Pager";
import { useLoad } from "../useLoad";

const copy = adminPortalCopy.month;

/** The month at a glance for the team: who is late, who has a rejected document or an overdue guide. */
export function MonthOverview() {
  const current = currentDocumentsCompetence();
  const [query, setQuery] = useState<AdminMonthQuery>({ competence: current, filter: "all", page: 1 });
  const page = useLoad(() => api.adminMonth(query), [JSON.stringify(query)]);
  const set = (p: Partial<AdminMonthQuery>) => setQuery((q) => ({ ...q, page: 1, ...p }));
  const months = Array.from({ length: 6 }, (_, i) => addMonthsToCompetence(current, -i));
  const t = page.data?.totals;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.3rem] font-semibold">{copy.title(competenceLabel(query.competence ?? current))}</h1>
          {page.data && <p className="mt-1 text-[0.9rem] text-muted">{copy.lede(formatDay(page.data.dueDate))}</p>}
        </div>
        <label className="flex items-center gap-2 text-[0.86rem] text-muted">
          {copy.competence}
          <select value={query.competence} onChange={(e) => set({ competence: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink">
            {months.map((m) => <option key={m} value={m}>{competenceLabel(m)}</option>)}
          </select>
        </label>
      </div>

      {t && (
        <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-5">
          {(
            [
              ["complete", `${t.complete}/${t.customers}`, "all"],
              ["late", t.late, "late"],
              ["rejected", t.rejected, "rejected"],
              ["guidesOverdue", t.guidesOverdue, "unpaid"],
              ["noAccess", t.noAccess, "no_access"],
            ] as const
          ).map(([k, v, f]) => (
            <button
              key={k}
              type="button"
              onClick={() => set({ filter: f as MonthFilter })}
              aria-pressed={query.filter === f}
              className="bg-surface p-4 text-left hover:bg-surface-2 aria-pressed:bg-surface-2"
            >
              <dt className="text-[0.78rem] text-faint">{copy.totals[k]}</dt>
              <dd className={`mt-1 font-mono text-[1.4rem] font-semibold tabular-nums ${k !== "complete" && Number(v) > 0 ? "text-brand" : ""}`}>{v}</dd>
            </button>
          ))}
        </dl>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">{copy.search}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input type="search" placeholder={copy.search} className="field-input bg-surface py-2 pl-9" onChange={(e) => set({ q: e.target.value || undefined })} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MONTH_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={query.filter === f}
              onClick={() => set({ filter: f })}
              className="rounded-full border border-line px-3 py-1.5 text-[0.84rem] text-muted aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white"
            >
              {copy.filters[f]}
            </button>
          ))}
        </div>
      </div>

      {page.error && <p className="text-brand">{adminCopy.loadError}</p>}
      {!page.data && !page.error && <p className="text-muted">{adminCopy.loading}</p>}
      {page.data?.items.length === 0 && <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{copy.empty}</p>}
      {!!page.data?.items.length && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[820px] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">{copy.cols.customer}</th>
                <th className="px-4 py-3 font-medium">{copy.cols.documents}</th>
                <th className="px-4 py-3 font-medium">{copy.cols.guides}</th>
                <th className="px-4 py-3 font-medium">{copy.cols.overdue}</th>
                <th className="px-4 py-3 font-medium">{copy.cols.lastSeen}</th>
                <th className="px-4 py-3"><span className="sr-only">{copy.publish}</span></th>
              </tr>
            </thead>
            <tbody>
              {page.data.items.map((r) => <Row key={r.customerId} r={r} competence={page.data!.competence} />)}
            </tbody>
          </table>
        </div>
      )}
      {page.data && <Pager page={page.data.page} pageSize={page.data.pageSize} total={page.data.total} onPage={(p) => setQuery((q) => ({ ...q, page: p }))} />}
    </section>
  );
}

function Row({ r, competence }: { r: AdminMonthRow; competence: string }) {
  const complete = r.docsSent >= r.docsRequired;
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
      <td className="px-4 py-3">
        <Link href={`/admin/cliente?id=${r.customerId}&competencia=${competence}`} className="font-medium hover:underline">{r.name}</Link>
        <span className="block text-[0.78rem] tabular-nums text-faint">
          {formatDocument(r.document)}
          {r.access !== "FULL" && <>, {accessLabels[r.access].toLowerCase()}</>}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span className="flex w-[84px] gap-0.5" aria-hidden="true">
            {Array.from({ length: Math.max(1, r.docsRequired) }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < r.docsSent ? "bg-ok" : "bg-surface-3"}`} />
            ))}
          </span>
          <span className={`tabular-nums ${complete ? "text-ok" : ""}`}>{r.docsSent}/{r.docsRequired}</span>
          {r.docsRejected > 0 && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[0.74rem] font-medium text-brand-dark">{r.docsRejected} recusa</span>}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums">{r.guidesPublished}</td>
      <td className={`px-4 py-3 tabular-nums ${r.guidesOverdue ? "font-semibold text-brand" : "text-faint"}`}>{r.guidesOverdue}</td>
      <td className="px-4 py-3 text-[0.84rem]">
        {r.hasLogin ? (
          r.lastSeenAt ? formatDate(r.lastSeenAt) : copy.never
        ) : (
          <span className="text-brand-dark">{r.invitePending ? copy.invitePending : copy.noLogin}</span>
        )}
        {r.hasLogin && !r.onboarded && <span className="block text-[0.76rem] text-faint">{copy.notOnboarded}</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`/admin/guias/nova?cliente=${r.customerId}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.82rem] hover:border-muted">
          <Upload size={14} aria-hidden="true" />
          {copy.publish}
        </Link>
      </td>
    </tr>
  );
}
