"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { todayInSaoPaulo, type AdminCustomersQuery } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { accessLabels, adminPortalCopy } from "@/config/admin-portal";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatDocument } from "@/lib/format";
import { Field, FormError } from "@/components/auth/AuthCard";
import { Pager } from "../Pager";
import { useLoad } from "../useLoad";

const copy = adminPortalCopy.customers;

export function Customers() {
  const [query, setQuery] = useState<AdminCustomersQuery>({ page: 1 });
  const rows = useLoad(() => api.adminCustomers(query), [JSON.stringify(query)]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.3rem] font-semibold">{copy.title}</h1>
        <Link href="/admin/clientes/novo" className="btn btn-primary px-4 py-2 text-[0.88rem]">
          <Plus size={16} aria-hidden="true" />
          {copy.add}
        </Link>
      </div>
      <label className="relative mb-4 block">
        <span className="sr-only">{copy.search}</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input type="search" placeholder={copy.search} className="field-input bg-surface py-2 pl-9" onChange={(e) => setQuery({ q: e.target.value || undefined, page: 1 })} />
      </label>
      {rows.error && <p className="text-brand">{adminCopy.loadError}</p>}
      {!rows.data && !rows.error && <p className="text-muted">{adminCopy.loading}</p>}
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

/** A customer who pays outside the site: MANUAL contract + login + invite. */
export function NewCustomerForm() {
  const router = useRouter();
  const c = adminPortalCopy.newCustomer;
  const today = todayInSaoPaulo();
  const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const reais = String(f.get("amount") || "0").replace(/\./g, "").replace(",", ".");
    setBusy(true);
    try {
      const { id } = await api.adminCreateCustomer({
        name: String(f.get("name")),
        email: String(f.get("email")),
        phone: String(f.get("phone")),
        document: String(f.get("document")),
        startsAt: String(f.get("startsAt")),
        endsAt: String(f.get("endsAt")),
        amountCents: Math.round(Number(reais) * 100) || 0,
        sendInvite: f.get("sendInvite") === "on",
      });
      router.replace(`/admin/cliente?id=${id}&aba=access`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message : c.error);
      setBusy(false);
    }
  }

  return (
    <section className="max-w-[640px]">
      <Link href="/admin/clientes" className="mb-4 inline-flex items-center gap-1.5 text-[0.86rem] text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        {c.back}
      </Link>
      <h1 className="text-[1.3rem] font-semibold">{c.title}</h1>
      <p className="mb-6 mt-1 text-[0.9rem] text-muted">{c.lede}</p>
      <form onSubmit={submit} className="rounded-[14px] border border-line bg-surface p-5">
        <Field id="name" label={c.name} required minLength={2} maxLength={120} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field id="document" label={c.document} required minLength={11} maxLength={18} inputMode="numeric" />
          <Field id="phone" label={c.phone} type="tel" required minLength={10} maxLength={20} />
        </div>
        <Field id="email" label={c.email} type="email" required />
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field id="startsAt" label={c.startsAt} type="date" defaultValue={today} required />
          <Field id="endsAt" label={c.endsAt} type="date" defaultValue={nextYear} required />
          <Field id="amount" label={c.amount} inputMode="decimal" placeholder="3.588,00" />
        </div>
        <label className="mb-5 flex items-center gap-2.5 text-[0.9rem]">
          <input type="checkbox" name="sendInvite" defaultChecked className="size-4 accent-brand" />
          {c.sendInvite}
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-primary" disabled={busy}>{c.submit}</button>
      </form>
    </section>
  );
}
