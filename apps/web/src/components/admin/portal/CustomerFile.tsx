"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Check, Upload } from "lucide-react";
import {
  competenceLabel,
  GUIDE_TYPE_LABELS,
  planInfo,
  REJECTION_REASONS,
  type AdminCustomerDetail,
  type DocumentRequest,
  type PortalFile,
  type RejectionReason,
} from "@exactra/shared";
import { adminCopy, statusLabels } from "@/config/admin";
import { accessLabels, adminPortalCopy } from "@/config/admin-portal";
import { portalCopy } from "@/config/portal";
import { api, ApiError } from "@/lib/api";
import { formatBRLExact, formatDate, formatDay, formatDocument } from "@/lib/format";
import { FileList, openSigned } from "@/components/portal/files";
import { useLoad } from "../useLoad";

const copy = adminPortalCopy.file;
const TABS = ["documents", "guides", "access", "checklist"] as const;
type Tab = (typeof TABS)[number];

export function CustomerFile() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const tab = (TABS as readonly string[]).includes(params.get("aba") ?? "") ? (params.get("aba") as Tab) : "documents";
  const customer = useLoad(() => api.adminCustomer(id), [id]);
  const go = (t: Tab) => router.replace(`/admin/cliente?id=${id}&aba=${t}${params.get("competencia") ? `&competencia=${params.get("competencia")}` : ""}`);

  if (customer.error && !customer.data) return <p className="text-brand">{copy.notFound}</p>;
  if (!customer.data) return <p className="text-muted">{adminCopy.loading}</p>;
  const c = customer.data;

  return (
    <section>
      <Link href="/admin/mes" className="mb-4 inline-flex items-center gap-1.5 text-[0.86rem] text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        {copy.back}
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold">{c.name}</h1>
          <p className="text-[0.86rem] tabular-nums text-muted">
            {formatDocument(c.document)}, {accessLabels[c.access.level].toLowerCase()}
            {c.access.endsAt && `, contrato até ${formatDate(c.access.endsAt)}`}
          </p>
        </div>
        <Link href={`/admin/guias/nova?cliente=${c.id}`} className="btn btn-primary px-4 py-2 text-[0.88rem]">
          <Upload size={15} aria-hidden="true" />
          {copy.publish}
        </Link>
      </div>
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => go(t)}
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[0.9rem] text-muted aria-selected:border-navy aria-selected:font-semibold aria-selected:text-ink"
          >
            {copy.tabs[t]}
          </button>
        ))}
      </div>
      {tab === "documents" && <DocumentsTab customerId={c.id} competence={params.get("competencia") ?? undefined} />}
      {tab === "guides" && <GuidesTab customerId={c.id} />}
      {tab === "access" && <AccessTab c={c} onChange={customer.reload} />}
      {tab === "checklist" && <ChecklistTab c={c} onChange={customer.reload} />}
    </section>
  );
}

const openFile = (f: PortalFile) => openSigned(() => api.adminFileUrl(f.id, true));

function DocumentsTab({ customerId, competence }: { customerId: string; competence?: string }) {
  const [month, setMonth] = useState(competence);
  const docs = useLoad(() => api.adminDocuments(customerId, month), [customerId, month]);
  const [rejecting, setRejecting] = useState<DocumentRequest | null>(null);
  if (!docs.data) return <p className="text-muted">{docs.error ? adminCopy.loadError : adminCopy.loading}</p>;
  const m = docs.data;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select value={m.competence} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.88rem]">
          {m.competences.map((x) => <option key={x} value={x}>{competenceLabel(x)}</option>)}
        </select>
        <p className="text-[0.86rem] text-muted">Prazo: {formatDay(m.dueDate)}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {m.requests.map((r) => (
          <li key={r.id} className={`rounded-[14px] border bg-surface p-4 ${r.status === "REJECTED" ? "border-brand/40" : "border-line"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {r.status === "SENT" ? <Check size={18} className="text-ok" aria-hidden="true" /> : r.status === "REJECTED" ? <AlertCircle size={18} className="text-brand" aria-hidden="true" /> : <span className="size-[18px] rounded-full border-2 border-dashed border-surface-3" aria-hidden="true" />}
              <span className="font-semibold">{r.title}</span>
              <span className="text-[0.78rem] text-faint">{r.required ? portalCopy.documents.required : portalCopy.documents.optional}</span>
              <span className="ml-auto text-[0.82rem] text-muted">{portalCopy.documents.status[r.status]}</span>
              {r.status === "SENT" && (
                <button type="button" onClick={() => setRejecting(r)} className="rounded-full border border-line px-3 py-1 text-[0.8rem] hover:border-brand hover:text-brand">{copy.reject}</button>
              )}
            </div>
            {r.rejection && <p className="mt-2 text-[0.84rem] text-brand-dark">{REJECTION_REASONS[r.rejection.reason]}{r.rejection.note ? `: ${r.rejection.note}` : ""}</p>}
            {r.files.length ? <FileList files={r.files} onOpen={openFile} /> : <p className="mt-2 text-[0.84rem] text-faint">{copy.noFiles}</p>}
          </li>
        ))}
        <li className="rounded-[14px] border border-dashed border-line bg-surface p-4">
          <span className="font-semibold">{copy.others}</span>
          {m.others.length ? <FileList files={m.others} onOpen={openFile} /> : <p className="mt-2 text-[0.84rem] text-faint">{copy.noFiles}</p>}
        </li>
      </ul>
      {rejecting && <RejectDialog r={rejecting} onClose={() => setRejecting(null)} onDone={docs.reload} />}
    </>
  );
}

function RejectDialog({ r, onClose, onDone }: { r: DocumentRequest; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<RejectionReason>("incomplete");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-label={copy.rejectTitle(r.title)} className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
      <div className="w-full max-w-[460px] rounded-2xl bg-surface p-6">
        <h2 className="text-[1.1rem] font-semibold">{copy.rejectTitle(r.title)}</h2>
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="mb-1 text-[0.84rem] text-muted">{copy.rejectReason}</legend>
          {(Object.keys(REJECTION_REASONS) as RejectionReason[]).map((k) => (
            <label key={k} className="flex items-center gap-2.5 text-[0.9rem]">
              <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="accent-brand" />
              {REJECTION_REASONS[k]}
            </label>
          ))}
        </fieldset>
        <label htmlFor="note" className="mb-1.5 mt-4 block text-[0.84rem] text-muted">{copy.rejectNote}</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="field-input" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-[0.88rem]">{copy.cancel}</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await api.adminReject(r.id, { reason, note: note.trim() || undefined }).catch(() => undefined);
              onDone();
              onClose();
            }}
            className="btn btn-primary px-4 py-2 text-[0.88rem]"
          >
            {copy.rejectSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidesTab({ customerId }: { customerId: string }) {
  const guides = useLoad(() => api.adminGuides(customerId), [customerId]);
  if (!guides.data) return <p className="text-muted">{guides.error ? adminCopy.loadError : adminCopy.loading}</p>;
  if (!guides.data.length) return <p className="rounded-[14px] border border-line bg-surface p-6 text-muted">{copy.guidesEmpty}</p>;
  return (
    <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {guides.data.map((g) => (
        <li key={g.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line px-4 py-3 text-[0.88rem] last:border-b-0">
          <span className="min-w-[200px] flex-1">
            <span className="font-medium">{g.label || GUIDE_TYPE_LABELS[g.type]}</span>
            <span className="block text-[0.78rem] text-faint">{competenceLabel(g.competence)}. {copy.publishedBy(g.publishedBy, formatDate(g.publishedAt))}</span>
          </span>
          <span className="tabular-nums">{formatBRLExact(g.amountCents)}</span>
          <span className="tabular-nums">{formatDay(g.dueDate)}</span>
          <span className={g.status === "PAID" ? "text-ok" : g.status === "OVERDUE" ? "font-semibold text-brand" : ""}>{portalCopy.guides.status[g.status]}</span>
          <button type="button" onClick={() => openFile(g.file)} className="underline">PDF</button>
          {g.receipt && <button type="button" onClick={() => openFile(g.receipt!)} className="underline">{portalCopy.guides.receipt}</button>}
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(copy.removeGuideConfirm)) return;
              await api.adminDeleteGuide(g.id).catch(() => undefined);
              guides.reload();
            }}
            className="text-faint hover:text-brand"
          >
            {copy.removeGuide}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AccessTab({ c, onChange }: { c: AdminCustomerDetail; onChange: () => void }) {
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const activated = c.members.some((m) => m.activated);
  const p = c.profile;
  const box = "rounded-[14px] border border-line bg-surface p-5";

  async function invite() {
    setBusy(true);
    try {
      const r = await api.adminInvite(c.id);
      setMessage(copy.inviteSent(r.email));
      onChange();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : adminCopy.loadError);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={box}>
        <h2 className="mb-3 font-semibold">{copy.members}</h2>
        {c.members.length === 0 && <p className="text-[0.88rem] text-muted">{copy.noMembers}</p>}
        <ul className="flex flex-col gap-3">
          {c.members.map((m) => (
            <li key={m.userId} className="text-[0.88rem]">
              <span className="font-medium">{m.name}</span> <span className="text-muted">{m.email}</span>
              <span className={`block text-[0.8rem] ${m.activated ? "text-ok" : "text-brand-dark"}`}>
                {m.activated ? copy.activated : copy.notActivated}
                {!m.activated && m.inviteExpiresAt && `. ${copy.inviteExpires(formatDate(m.inviteExpiresAt))}`}
                {m.lastSeenAt && `. ${copy.lastSeen(formatDate(m.lastSeenAt))}`}
              </span>
            </li>
          ))}
        </ul>
        {!activated && (
          <button type="button" onClick={invite} disabled={busy} className="btn btn-navy mt-4 px-4 py-2 text-[0.88rem]">
            {c.members.length ? copy.resend : copy.invite}
          </button>
        )}
        {message && <p role="status" className="mt-3 text-[0.86rem] text-muted">{message}</p>}
      </section>

      <section className={box}>
        <h2 className="mb-3 font-semibold">{copy.data}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.88rem]">
          <dt className="text-faint">E-mail</dt><dd className="break-all">{c.email}</dd>
          <dt className="text-faint">Telefone</dt><dd>{c.phone}</dd>
          <dt className="text-faint">{copy.onboarded}</dt><dd>{c.onboardedAt ? formatDate(c.onboardedAt) : copy.onboardedNo}</dd>
          <dt className="text-faint">{copy.reminders}</dt>
          <dd>
            <button
              type="button"
              onClick={async () => {
                await api.adminUpdateCustomer(c.id, { remindersEnabled: !c.remindersEnabled }).catch(() => undefined);
                onChange();
              }}
              className="underline"
            >
              {c.remindersEnabled ? copy.remindersOn : copy.remindersOff}
            </button>
          </dd>
        </dl>
        <h3 className="mb-1.5 mt-4 text-[0.88rem] font-semibold">{copy.profile}</h3>
        <p className="text-[0.86rem] text-muted">
          {p
            ? `${portalCopy.profile.activities[p.activity].label}; ${p.hasEmployees ? "com" : "sem"} funcionários${p.banks.length ? `; bancos: ${p.banks.join(", ")}` : ""}${p.invoiceSystem ? `; notas: ${p.invoiceSystem}` : ""}.`
            : copy.noProfile}
        </p>
      </section>

      <section className={`${box} lg:col-span-2`}>
        <h2 className="mb-3 font-semibold">{copy.contracts}</h2>
        <ul className="flex flex-col gap-2 text-[0.88rem]">
          {c.contracts.map((k) => (
            <li key={k.id} className="flex flex-wrap gap-x-4">
              <span>{planInfo(k.plan).name}</span>
              <span className="tabular-nums">{formatDate(k.startsAt)} a {formatDate(k.endsAt)}</span>
              <span className="text-muted">{k.source === "MANUAL" ? copy.manual : portalCopy.plan.methods[k.method]}</span>
              <span className="text-muted">{statusLabels[k.status]}</span>
              {k.source === "CHECKOUT" && <Link href={`/admin/contrato?id=${k.id}`} className="underline">detalhe</Link>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ChecklistTab({ c, onChange }: { c: AdminCustomerDetail; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [required, setRequired] = useState(true);
  const toggle = async (itemId: string, off: boolean) => {
    const ids = off ? [...c.disabledItemIds, itemId] : c.disabledItemIds.filter((x) => x !== itemId);
    await api.adminUpdateCustomer(c.id, { disabledItemIds: ids }).catch(() => undefined);
    onChange();
  };
  return (
    <>
      <p className="mb-4 max-w-[70ch] text-[0.88rem] text-muted">{copy.checklistText}</p>
      <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {c.checklist.map((i) => (
          <li key={i.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-[0.88rem] last:border-b-0 ${!i.applies || i.disabled ? "text-faint" : ""}`}>
            <span className="min-w-[200px] flex-1 font-medium">{i.title}</span>
            <span className="text-[0.8rem]">{i.required ? portalCopy.documents.required : portalCopy.documents.optional}</span>
            <span className="text-[0.8rem]">{i.customerId ? copy.own : i.disabled ? copy.disabled : i.applies ? copy.applies : copy.notApplies}</span>
            {i.customerId ? (
              <button
                type="button"
                className="underline"
                onClick={async () => {
                  await api.adminUpdateChecklistItem(i.id, { active: false }).catch(() => undefined);
                  onChange();
                }}
              >
                {copy.turnOff}
              </button>
            ) : (
              i.applies && <button type="button" className="underline" onClick={() => toggle(i.id, !i.disabled)}>{i.disabled ? copy.turnOn : copy.turnOff}</button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-[14px] border border-dashed border-line bg-surface p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (title.trim().length < 2) return;
          await api.adminCreateChecklistItem({ title: title.trim(), required, appliesTo: {}, customerId: c.id }).catch(() => undefined);
          setTitle("");
          onChange();
        }}
      >
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block text-[0.82rem] text-muted">{copy.addItem}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.itemTitle} maxLength={120} className="field-input bg-surface" />
        </label>
        <label className="flex items-center gap-2 pb-3 text-[0.88rem]">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-brand" />
          {copy.itemRequired}
        </label>
        <button type="submit" className="btn btn-navy px-4 py-2.5 text-[0.88rem]">{copy.add}</button>
      </form>
    </>
  );
}
