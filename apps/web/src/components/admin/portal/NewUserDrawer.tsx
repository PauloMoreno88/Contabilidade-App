"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { isValidTaxId, todayInSaoPaulo } from "@exactra/shared";
import { adminPortalCopy } from "@/config/admin-portal";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { createAdminError, parseAmountCents } from "@/lib/new-user";
import { Field, FormError } from "@/components/auth/AuthCard";

const copy = adminPortalCopy.newUser;
type UserType = keyof typeof copy.types;

/** Side drawer (600px) that creates a customer (manual contract + login) or a team admin. */
export function NewUserDrawer({ onClose, onAdminCreated }: { onClose: () => void; onAdminCreated: (email: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<UserType>("customer");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby="new-user-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[600px] max-w-full border-0 border-l border-line bg-surface p-0 text-ink backdrop:bg-navy/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="new-user-title" className="text-[1.15rem] font-semibold">{copy.title}</h2>
          <button type="button" onClick={close} aria-label={copy.close} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5">
            <label htmlFor="userType" className="mb-1.5 block text-[0.82rem] text-muted">{copy.type}</label>
            <select id="userType" value={type} onChange={(e) => setType(e.target.value as UserType)} className="field-input">
              {Object.entries(copy.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {type === "customer" ? <CustomerForm onCancel={close} /> : <AdminForm onCancel={close} onCreated={(email) => { onAdminCreated(email); close(); }} />}
        </div>
      </div>
    </dialog>
  );
}

function Actions({ busy, submit, onCancel }: { busy: boolean; submit: string; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onCancel} className="btn btn-ghost px-4 py-2.5 text-[0.9rem]">{copy.cancel}</button>
      <button type="submit" className="btn btn-primary px-5 py-2.5 text-[0.9rem]" aria-busy={busy} disabled={busy}>{submit}</button>
    </div>
  );
}

/** A customer who pays outside the site: MANUAL contract + login + invite. */
function CustomerForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const c = adminPortalCopy.newCustomer;
  const today = todayInSaoPaulo();
  const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!isValidTaxId(String(f.get("document")))) return setError(c.invalidDocument);
    setBusy(true);
    try {
      const { id } = await api.adminCreateCustomer({
        name: String(f.get("name")),
        email: String(f.get("email")),
        phone: String(f.get("phone")),
        document: String(f.get("document")),
        startsAt: String(f.get("startsAt")),
        endsAt: String(f.get("endsAt")),
        amountCents: parseAmountCents(String(f.get("amount") || "")),
        sendInvite: f.get("sendInvite") === "on",
      });
      router.push(`/admin/cliente?id=${id}&aba=access`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message : c.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-5 text-[0.88rem] text-muted">{c.lede}</p>
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
      <Actions busy={busy} submit={c.submit} onCancel={onCancel} />
    </form>
  );
}

/** A team admin with an initial password chosen here (decision of 10/11/2026, docs/specs/drawer-criar-usuario.md). */
function AdminForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (email: string) => void }) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("adminEmail")).trim().toLowerCase();
    setBusy(true);
    setError(undefined);
    try {
      const { error: err } = await authClient.admin.createUser({
        name: String(f.get("adminName")).trim(),
        email,
        password: String(f.get("adminPassword")),
        role: "admin",
      });
      if (!err) return onCreated(email);
      setError(copy.adminErrors[createAdminError(err.code)]);
    } catch {
      setError(copy.adminErrors.generic);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-5 text-[0.88rem] text-muted">{copy.adminLede}</p>
      <Field id="adminName" label={copy.adminName} required minLength={2} maxLength={120} autoComplete="off" />
      <Field id="adminEmail" label={copy.adminEmail} type="email" required autoComplete="off" />
      <Field id="adminPassword" label={copy.adminPassword} hint={copy.adminPasswordHint} type="text" required minLength={8} maxLength={128} autoComplete="new-password" spellCheck={false} />
      <FormError>{error}</FormError>
      <Actions busy={busy} submit={copy.adminSubmit} onCancel={onCancel} />
    </form>
  );
}
