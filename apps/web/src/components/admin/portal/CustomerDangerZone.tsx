"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sameCompanyName, type AdminCustomerDetail } from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { adminPortalCopy } from "@/config/admin-portal";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";

const copy = adminPortalCopy.remove;

/** "Desativar" / "Reativar" and "Apagar" (docs/specs/remover-cliente.md). */
export function CustomerDangerZone({ c, onChange }: { c: AdminCustomerDetail; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  async function toggle() {
    if (!c.deactivatedAt && !window.confirm(copy.deactivateConfirm(c.name))) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await (c.deactivatedAt ? api.adminReactivateCustomer(c.id) : api.adminDeactivateCustomer(c.id));
      onChange();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : adminCopy.loadError);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-[14px] border border-brand/30 bg-surface p-5 lg:col-span-2">
      <h2 className="mb-1 font-semibold">{copy.title}</h2>
      <div className="mt-3 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-[0.92rem] font-semibold">{c.deactivatedAt ? copy.reactivate : copy.deactivate}</h3>
          <p className="mb-3 mt-1 text-[0.86rem] text-muted">{c.deactivatedAt ? copy.reactivateText : copy.deactivateText}</p>
          <button type="button" onClick={toggle} aria-busy={busy} disabled={busy} className="btn btn-ghost px-4 py-2 text-[0.88rem]">
            {c.deactivatedAt ? copy.reactivate : copy.deactivate}
          </button>
        </div>
        <div>
          <h3 className="text-[0.92rem] font-semibold">{copy.delete}</h3>
          {c.canDelete ? (
            <>
              <p className="mb-3 mt-1 text-[0.86rem] text-muted">{copy.deleteText}</p>
              <button type="button" onClick={() => setDeleting(true)} className="btn px-4 py-2 text-[0.88rem] border border-brand text-brand hover:bg-brand-tint">
                {copy.delete}
              </button>
            </>
          ) : (
            <p className="mt-1 text-[0.86rem] text-muted">{copy.deleteBlocked}</p>
          )}
        </div>
      </div>
      {message && <p role="alert" className="mt-3 text-[0.86rem] text-brand">{message}</p>}
      {deleting && <DeleteDialog c={c} onClose={() => setDeleting(false)} />}
    </section>
  );
}

/** The company name must be typed again; the API checks it too. */
function DeleteDialog({ c, onClose }: { c: AdminCustomerDetail; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const matches = sameCompanyName(name, c.name);

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      await api.adminDeleteCustomer(c.id, { confirmName: name });
      router.replace(`/admin/clientes?apagado=${encodeURIComponent(c.name)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : adminCopy.loadError);
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-surface p-6">
        <h2 id="delete-title" className="text-[1.1rem] font-semibold">{copy.deleteTitle(c.name)}</h2>
        <p className="mt-2 text-[0.88rem] text-muted">{copy.deleteDialogText}</p>
        {c.deactivatedAt && <p className="mt-2 text-[0.84rem] text-faint">{copy.deactivatedOn(formatDate(c.deactivatedAt))}</p>}
        <label htmlFor="confirm-name" className="mb-1.5 mt-4 block text-[0.84rem] text-muted">{copy.typeName(c.name)}</label>
        <input id="confirm-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className="field-input" />
        {error && <p role="alert" className="mt-2 text-[0.86rem] text-brand">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost px-4 py-2 text-[0.88rem]">{copy.cancel}</button>
          <button type="button" onClick={remove} disabled={!matches || busy} aria-busy={busy} className="btn btn-primary px-4 py-2 text-[0.88rem]">
            {copy.deleteSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
