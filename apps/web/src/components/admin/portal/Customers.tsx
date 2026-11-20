"use client";

import { feedbackCopy } from "@/config/feedback";
import { Loading } from "@/components/common/Loading";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { AdminCustomersQuery } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { accessLabels, adminPortalCopy } from "@/config/admin-portal";
import { api } from "@/lib/api";
import { formatDate, formatDocument } from "@/lib/format";
import { Pager } from "../Pager";
import { useLoad } from "../useLoad";
import { NewUserDrawer } from "./NewUserDrawer";

const copy = adminPortalCopy.customers;

export function Customers() {
  const [query, setQuery] = useState<AdminCustomersQuery>({ page: 1 });
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState<string>();
  const rows = useLoad(() => api.adminCustomers(query), [JSON.stringify(query)]);

  return (
    <section>
      {rows.data && rows.loading && <Loading compact label={feedbackCopy.updating} />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.3rem] font-semibold">{copy.title}</h1>
        <button type="button" onClick={() => { setNotice(undefined); setDrawer(true); }} className="btn btn-primary px-4 py-2 text-[0.88rem]">
          <Plus size={16} aria-hidden="true" />
          {copy.add}
        </button>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-ok-tint px-4 py-3 text-[0.88rem]">{notice}</p>}
      {drawer && <NewUserDrawer onClose={() => setDrawer(false)} onAdminCreated={(email) => setNotice(copy.adminCreated(email))} />}
      <label className="relative mb-4 block">
        <span className="sr-only">{copy.search}</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input type="search" placeholder={copy.search} className="field-input bg-surface py-2 pl-9" onChange={(e) => setQuery({ q: e.target.value || undefined, page: 1 })} />
      </label>
      {rows.error && <p className="text-brand">{adminCopy.loadError}</p>}
      {!rows.data && !rows.error && <Loading />}
      {rows.data?.items.length === 0 && <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{copy.empty}</p>}
      {!!rows.data?.items.length && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
          <table className="w-full min-w-[680px] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-faint">
              <tr>
                {Object.values(copy.cols).map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.data.items.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/cliente?id=${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <span className="block text-[0.78rem] text-faint">{c.email}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDocument(c.document)}</td>
                  <td className="px-4 py-3">{accessLabels[c.access]}</td>
                  <td className="px-4 py-3 tabular-nums">{formatDate(c.endsAt)}</td>
                  <td className={`px-4 py-3 ${c.hasLogin ? "text-ok" : "text-brand-dark"}`}>{c.hasLogin ? copy.loginOk : c.invitePending ? copy.loginPending : copy.loginNone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.data && <Pager page={rows.data.page} pageSize={rows.data.pageSize} total={rows.data.total} onPage={(p) => setQuery((q) => ({ ...q, page: p }))} />}
    </section>
  );
}
