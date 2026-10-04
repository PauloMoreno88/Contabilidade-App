"use client";

import { PLANS } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { api } from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/format";
import { useLoad } from "./useLoad";

const copy = adminCopy.leads;

export function LeadsTable() {
  const { data, error } = useLoad(() => api.adminLeads(), []);
  return (
    <>
      <h1 className="mb-4 text-[1.3rem] font-semibold">{copy.title}</h1>
      {error && <p className="text-brand">{adminCopy.loadError}</p>}
      {!data && !error && <p className="text-muted">{adminCopy.loading}</p>}
      {data?.length === 0 && <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{copy.empty}</p>}
      {!!data?.length && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-faint">
              <tr>{Object.values(copy.cols).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    {l.email && <div className="text-[0.78rem] text-faint">{l.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`https://wa.me/55${l.whatsapp}`} target="_blank" rel="noopener" className="font-mono tabular-nums hover:text-brand">{l.whatsapp}</a>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatBRL(l.monthlyRevenue * 100)}</td>
                  <td className="px-4 py-3">{PLANS[l.recommendedPlan].name}</td>
                  <td className="px-4 py-3">{[l.utmSource, l.utmCampaign].filter(Boolean).join(" / ") || copy.noSource}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
