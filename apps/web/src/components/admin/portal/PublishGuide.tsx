"use client";

import { LoadState } from "@/components/portal/ui";
import { Loading } from "@/components/common/Loading";
import { feedbackCopy } from "@/config/feedback";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileUp } from "lucide-react";
import {
  competenceSchema,
  currentDocumentsCompetence,
  formatBarcodeLine,
  GUIDE_TYPE_LABELS,
  GUIDE_TYPES,
  parseBarcodeLine,
  type GuideParseResult,
  type GuideType,
  type PortalFile,
} from "@exactra/shared";
import { adminCopy } from "@/config/admin";
import { adminPortalCopy } from "@/config/admin-portal";
import { api } from "@/lib/api";
import { formatBRLExact, formatDocument } from "@/lib/format";
import { UploadProgress } from "@/components/portal/files";
import { useUpload } from "@/components/portal/useUpload";
import { useLoad } from "../useLoad";

const copy = adminPortalCopy.publish;

/** "1.234,56" or "1234.56" → 123456 cents; NaN when it is not a number. */
const toCents = (s: string) => {
  const clean = s.trim().replace(/\s|R\$/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return normalized ? Math.round(Number(normalized) * 100) : NaN;
};
const fromCents = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/**
 * Upload the PDF → the API reads it and suggests the fields → a person checks and publishes.
 * Nothing is published from the PDF alone (docs/plano.md, decision 25).
 */
export function PublishGuide() {
  const params = useSearchParams();
  const [customerId, setCustomerId] = useState(params.get("cliente") ?? "");
  const customers = useLoad(() => api.adminCustomers({ pageSize: 100 }), []);
  const [file, setFile] = useState<PortalFile | null>(null);
  const [parsed, setParsed] = useState<GuideParseResult | null>(null);
  const [reading, setReading] = useState(false);
  const [form, setForm] = useState({ type: "DAS" as GuideType, label: "", competence: currentDocumentsCompetence(), amount: "", dueDate: "", barcode: "" });
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { uploads, upload, dismiss, busy: uploading } = useUpload({ staff: true });

  const customer = customers.data?.items.find((c) => c.id === customerId);
  const set = (p: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...p }));
    setChecked(false);
  };

  async function pick(f: File) {
    setFile(null);
    setParsed(null);
    setError(undefined);
    const [uploaded] = await upload([f], { purpose: "guide", customerId });
    if (!uploaded) return;
    setFile(uploaded);
    setReading(true);
    try {
      const r = await api.adminParseGuide(uploaded.id);
      setParsed(r);
      setForm((x) => ({
        ...x,
        type: r.type ?? x.type,
        competence: r.competence ?? x.competence,
        dueDate: r.dueDate ?? x.dueDate,
        amount: r.barcodeAmountCents ? fromCents(r.barcodeAmountCents) : x.amount,
        barcode: r.barcode ?? "",
      }));
    } catch {
      // Reading is a convenience: the form still works by hand.
    }
    setReading(false);
  }

  const cents = toCents(form.amount);
  const line = form.barcode.trim() ? parseBarcodeLine(form.barcode) : null;
  const lineInvalid = Boolean(form.barcode.trim()) && !line?.valid;
  const mismatch = Boolean(line?.valid && line.amountCents !== null && line.amountCents !== cents);
  const valid = file && cents > 0 && /^\d{4}-\d{2}-\d{2}$/.test(form.dueDate) && competenceSchema.safeParse(form.competence).success && !lineInvalid && !mismatch;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || !checked || !file) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.adminCreateGuide({
        customerId,
        fileId: file.id,
        type: form.type,
        label: form.label.trim() || undefined,
        competence: form.competence,
        amountCents: cents,
        dueDate: form.dueDate,
        barcode: line?.valid ? line.line : undefined,
      });
      setDone(customerId);
    } catch {
      setError(copy.error);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <section className="max-w-[560px] rounded-[14px] border border-line bg-surface p-6">
        <CheckCircle2 size={28} className="text-ok" aria-hidden="true" />
        <p className="mt-3 font-semibold">{copy.done}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary px-4 py-2 text-[0.88rem]" onClick={() => window.location.reload()}>{copy.another}</button>
          <Link href={`/admin/cliente?id=${done}&aba=guides`} className="btn btn-ghost px-4 py-2 text-[0.88rem]">{copy.goFile}</Link>
        </div>
      </section>
    );
  }

  const field = "field-input bg-surface";
  return (
    <section className="max-w-[760px]">
      {customers.data && customers.loading && <Loading compact label={feedbackCopy.updating} />}
      <Link href={customerId ? `/admin/cliente?id=${customerId}&aba=guides` : "/admin/mes"} className="mb-4 inline-flex items-center gap-1.5 text-[0.86rem] text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        {adminPortalCopy.file.back}
      </Link>
      <h1 className="mb-5 text-[1.3rem] font-semibold">{copy.title}</h1>

      {customers.error && <LoadState error onRetry={customers.reload} />}
      {!customers.data && !customers.error && <Loading />}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="rounded-[14px] border border-line bg-surface p-5">
          <label htmlFor="customer" className="mb-1.5 block text-[0.84rem] font-semibold">{copy.customer}</label>
          <select
            id="customer"
            disabled={customers.loading || uploading || reading || busy}
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setFile(null);
              setParsed(null);
            }}
            className={field}
            required
          >
            <option value="">{customers.data ? copy.pickCustomer : adminCopy.loading}</option>
            {customers.data?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({formatDocument(c.document)})</option>
            ))}
          </select>

          <div className="mt-5">
            <p className="text-[0.84rem] font-semibold">{copy.pdf}</p>
            <p className="mb-2.5 text-[0.82rem] text-faint">{copy.pdfHint}</p>
            <button type="button" disabled={!customerId || uploading || reading || busy} aria-busy={uploading || reading} onClick={() => input.current?.click()} className="btn btn-navy px-4 py-2 text-[0.88rem]">
              <FileUp size={16} aria-hidden="true" />
              {file ? file.fileName : copy.pdf}
            </button>
            <input ref={input} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-label={copy.pdf} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
            <UploadProgress uploads={uploads} onDismiss={dismiss} />
            {reading && (
              <p role="status" className="mt-3 flex items-center gap-2 text-[0.86rem] text-muted">
                <span className="loading-spinner" aria-hidden="true" />
                {copy.reading}
              </p>
            )}
          </div>

          {parsed && (
            <div className="mt-4 rounded-xl bg-surface-2 p-4 text-[0.86rem]">
              <p className="mb-2 font-semibold">{copy.readResult}</p>
              {parsed.barcode && parsed.amountMatchesText && parsed.warnings.length === 0 && (
                <p className="flex gap-2 text-ok"><CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{copy.readOk}</p>
              )}
              <ul className="flex flex-col gap-1.5">
                {parsed.warnings.map((w) => (
                  <li key={w} className="flex gap-2 text-brand-dark"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <fieldset disabled={!file || reading || uploading || busy} className="grid gap-4 rounded-[14px] border border-line bg-surface p-5 disabled:opacity-50 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.type}</span>
            <select value={form.type} onChange={(e) => set({ type: e.target.value as GuideType })} className={field}>
              {GUIDE_TYPES.map((t) => <option key={t} value={t}>{GUIDE_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.label}</span>
            <input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder={copy.labelHint} maxLength={80} className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.competence}</span>
            <input type="month" value={form.competence} onChange={(e) => set({ competence: e.target.value })} required className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.dueDate}</span>
            <input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} required className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.amount}</span>
            <input value={form.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="decimal" placeholder="412,50" required className={`${field} tabular-nums`} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[0.84rem] text-muted">{copy.barcode}</span>
            <input value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} inputMode="numeric" className={`${field} font-mono text-[0.88rem]`} />
            <span className={`mt-1 block text-[0.8rem] ${lineInvalid || mismatch ? "text-brand" : "text-faint"}`}>
              {lineInvalid ? copy.barcodeInvalid : mismatch ? copy.amountMismatch : line?.valid ? `${formatBarcodeLine(line.line)}. ${line.amountCents ? copy.barcodeAmount(formatBRLExact(line.amountCents)) : ""}` : copy.barcodeHint}
            </span>
          </label>
        </fieldset>

        {valid && (
          <div className="rounded-[14px] border-2 border-navy bg-surface p-5">
            <p className="mb-3 text-[0.84rem] font-semibold">{copy.confirmTitle}</p>
            <p className="font-serif text-[2rem] font-semibold tabular-nums leading-none">{formatBRLExact(cents)}</p>
            <p className="mt-2 text-[0.95rem]">
              {form.label || GUIDE_TYPE_LABELS[form.type]}, vence em <strong className="tabular-nums">{form.dueDate.split("-").reverse().join("/")}</strong>
            </p>
            <p className="mt-1 text-[0.9rem] text-muted">{customer?.name}</p>
            <label className="mt-4 flex items-center gap-2.5 text-[0.9rem]">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="size-4 accent-brand" />
              {copy.confirm}
            </label>
          </div>
        )}
        {error && <p role="alert" className="text-[0.88rem] text-brand">{error}</p>}
        <button type="submit" aria-busy={busy} disabled={!valid || !checked || busy || uploading || reading} className="btn btn-primary w-fit">{copy.submit}</button>
      </form>
    </section>
  );
}
