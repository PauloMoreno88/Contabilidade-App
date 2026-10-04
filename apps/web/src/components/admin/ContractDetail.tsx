"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PLANS } from "@exactra/shared";
import { adminCopy, paymentStatusLabels } from "@/config/admin";
import { methodLabels, periodLabels } from "@/config/checkout";
import { api } from "@/lib/api";
import { formatBRLExact, formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { useLoad } from "./useLoad";

const copy = adminCopy.detail;

export function ContractDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { data: c, error } = useLoad(() => api.adminContract(id), [id]);

  return (
    <>
      <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 text-[0.88rem] text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        {copy.back}
      </Link>
      {error && <p className="text-muted">{copy.notFound}</p>}
      {!c && !error && <p className="text-muted">{adminCopy.loading}</p>}
      {c && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1 className="text-[1.5rem] font-semibold">{c.customerName}</h1>
            <StatusBadge status={c.status} />
          </div>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <Panel
              title={copy.customer}
              rows={[
                [copy.email, <a key="e" href={`mailto:${c.email}`} className="hover:text-brand">{c.email}</a>],
                [copy.phone, c.phone],
                [copy.document, c.document],
              ]}
            />
            <Panel
              title={copy.contract}
              rows={[
                [copy.plan, PLANS[c.plan].name],
                [copy.period, periodLabels[c.period]],
                [copy.method, methodLabels[c.method].label],
                [copy.amount, formatBRLExact(c.amountCents)],
                [copy.createdAt, formatDate(c.createdAt)],
                [copy.startsAt, formatDate(c.startsAt)],
                [copy.endsAt, formatDate(c.endsAt)],
              ]}
            />
          </div>

          <h2 className="mb-3 font-semibold">{copy.payments}</h2>
          {c.payments.length === 0 ? (
            <p className="text-muted">{copy.noPayments}</p>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
              <table className="w-full min-w-[480px] text-left text-[0.88rem]">
                <thead className="border-b border-line text-[0.78rem] text-faint">
                  <tr>{Object.values(copy.cols).map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {c.payments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-mono tabular-nums">{formatDate(p.paidAt ?? p.createdAt)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatBRLExact(p.amountCents)}</td>
                      <td className="px-4 py-3">{methodLabels[p.method].label}</td>
                      <td className="px-4 py-3">{paymentStatusLabels[p.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Panel({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5">
      <h2 className="mb-3 text-[0.9rem] font-semibold">{title}</h2>
      <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-2 text-[0.88rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-faint">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
