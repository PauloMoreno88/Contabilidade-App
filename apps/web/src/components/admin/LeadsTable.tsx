"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PLANS, type AdminLeadsQuery } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { api } from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/format";
import { Pager } from "./Pager";
import { useLoad } from "./useLoad";

const copy = adminCopy.leads;

export function LeadsTable() {
  const [query, setQuery] = useState<AdminLeadsQuery>({ page: 1 });
  const { data, error } = useLoad(() => api.adminLeads(query), [JSON.stringify(query)]);
  return (
    <>
      <h1 className="mb-4 text-[1.3rem] font-semibold">{copy.title}</h1>
      <label className="relative mb-4 block max-w-[420px]">
        <span className="sr-only">{copy.search}</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          type="search"
          placeholder={copy.search}
          className="field-input bg-surface py-2 pl-9"
          onChange={(e) => setQuery({ q: e.target.value || undefined, page: 1 })}
        />
      </label>
      {error && <p className="text-brand">{adminCopy.loadError}</p>}
      {!data && !error && <p className="text-muted">{adminCopy.loading}</p>}
      {data?.items.length === 0 && <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{copy.empty}</p>}
      {!!data?.items.length && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-faint">
              <tr>{Object.values(copy.cols).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    {l.email && <div className="text-[0.78rem] text-faint">{l.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`https://wa.me/55${l.whatsapp}`} target="_blank" rel="noopener" className="font-mono tabular-nums hover:text-brand">{l.whatsapp}</a>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatBRL(l.answers.monthlyRevenue * 100)}</td>
                  <td className="px-4 py-3">{PLANS[l.result.recommendedPlan].name}</td>
                  <td className="px-4 py-3">{[l.utm?.source, l.utm?.campaign].filter(Boolean).join(" / ") || copy.noSource}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager {...data} onPage={(page) => setQuery((q) => ({ ...q, page }))} />}
    </>
  );
}
