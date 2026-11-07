"use client";

import { AsyncButton } from "@/components/common/AsyncButton";
import { Loading } from "@/components/common/Loading";
import { feedbackCopy } from "@/config/feedback";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileDown, MessageCircle, Paperclip, Undo2 } from "lucide-react";
import { competenceLabel, daysUntil, formatBarcodeLine, whatsappLink, type PortalFile, type PortalGuide } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { formatBRLExact, formatDate, formatDay } from "@/lib/format";
import { openSigned, UploadProgress } from "./files";
import { guideName } from "./Home";
import { usePortal } from "./PortalShell";
import { LoadState, PageHeader } from "./ui";
import { useUpload } from "./useUpload";

const copy = portalCopy.guides;

export function Guides() {
  const params = useSearchParams();
  const focus = params.get("id");
  const guides = useLoad(() => api.guides(), []);
  const [tab, setTab] = useState<"open" | "paid">("open");

  // A link to one guide (e-mail, home) opens the tab it is in and scrolls to it.
  useEffect(() => {
    if (!guides.data || !focus) return;
    if (guides.data.paid.some((g) => g.id === focus)) setTab("paid");
    requestAnimationFrame(() => document.getElementById(`guia-${focus}`)?.scrollIntoView({ block: "center" }));
  }, [guides.data, focus]);

  const list = guides.data?.[tab] ?? [];
  return (
    <>
      {guides.data && guides.loading && <Loading compact label={feedbackCopy.updating} />}
      <PageHeader title={copy.title} lede={copy.lede} />
      <div role="tablist" aria-label={copy.title} className="mb-5 inline-flex rounded-full bg-surface-2 p-1 text-[0.9rem]">
        {(["open", "paid"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="rounded-full px-4 py-2 font-medium text-muted aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-[0_1px_2px_rgba(15,33,51,0.12)]"
          >
            {copy.tabs[t]}
            {guides.data && <span className="ml-1.5 tabular-nums text-faint">{guides.data[t].length}</span>}
          </button>
        ))}
      </div>

      {!guides.data ? (
        <LoadState error={guides.error} onRetry={guides.reload} />
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">{tab === "open" ? copy.emptyOpen : copy.emptyPaid}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((g) => (
            <li key={g.id} id={`guia-${g.id}`} className="scroll-mt-24">
              <GuideSlip g={g} highlighted={g.id === focus} onChange={guides.reload} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * A guide drawn like the stub of a payment slip: the tear line separates "what it is"
 * from "what to pay". The barcode line is the main action.
 */
function GuideSlip({ g, highlighted, onChange }: { g: PortalGuide; highlighted: boolean; onChange: () => void }) {
  const { writable } = usePortal();
  const [dialog, setDialog] = useState(false);
  const days = daysUntil(g.dueDate);
  const paid = g.status === "PAID";
  const urgent = !paid && (g.status === "OVERDUE" || days <= 1);
  const name = guideName(g);
  const t = portalCopy.home.task.guide;
  const whenText = paid ? copy.status.PAID : g.status === "OVERDUE" ? copy.status.OVERDUE : days === 0 ? t.today : t.due(days);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-surface md:grid md:grid-cols-[220px_1fr] ${highlighted ? "border-navy ring-2 ring-navy/15" : "border-line"} ${paid ? "opacity-[0.92]" : ""}`}
    >
      {/* Stub */}
      <div className={`relative px-5 py-4 md:py-5 ${paid ? "bg-surface-2/60" : "bg-surface-2"}`}>
        <p className="text-[0.8rem] text-faint">{copy.competence}</p>
        <p className="font-medium first-letter:uppercase">{competenceLabel(g.competence)}</p>
        <h3 className="mt-3 text-[1.02rem] font-semibold leading-snug">{name}</h3>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ${
            paid ? "bg-ok-tint text-ok" : urgent ? "bg-brand text-white" : "bg-surface text-ink"
          }`}
        >
          {paid && <Check size={13} strokeWidth={3} aria-hidden="true" />}
          {whenText}
        </span>
        {/* Tear line with notches: horizontal on phones, vertical from md up. */}
        <span aria-hidden="true" className="absolute inset-x-4 -bottom-px border-b-2 border-dashed border-line md:inset-x-auto md:inset-y-4 md:-right-px md:bottom-auto md:border-b-0 md:border-r-2" />
        <span aria-hidden="true" className="absolute -bottom-2.5 -left-2.5 size-5 rounded-full border border-line bg-bg md:-right-2.5 md:-top-2.5 md:bottom-auto md:left-auto" />
        <span aria-hidden="true" className="absolute -bottom-2.5 -right-2.5 size-5 rounded-full border border-line bg-bg md:-bottom-2.5 md:-right-2.5" />
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-5 md:pl-7">
        <dl className="flex flex-wrap items-end gap-x-10 gap-y-3">
          <div>
            <dt className="text-[0.8rem] text-faint">{copy.amount}</dt>
            <dd className="font-serif text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.01em]">{formatBRLExact(g.amountCents)}</dd>
          </div>
          <div>
            <dt className="text-[0.8rem] text-faint">{copy.dueDate}</dt>
            <dd className={`text-[1.2rem] font-semibold tabular-nums ${urgent ? "text-brand" : ""}`}>{formatDay(g.dueDate)}</dd>
          </div>
        </dl>

        {!paid && <Barcode barcode={g.barcode} />}

        {paid && (
          <p className="mt-4 text-[0.9rem] text-muted">
            {copy.paidOn(formatDate(g.paidAt))}
            {g.receipt && (
              <>
                {". "}
                <AsyncButton type="button" className="font-medium text-ink underline" onClick={() => openSigned(() => api.fileUrl(g.receipt!.id, true))}>
                  {copy.receipt}
                </AsyncButton>
              </>
            )}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AsyncButton type="button" onClick={() => openSigned(() => api.fileUrl(g.file.id, true))} className="btn btn-ghost px-4 py-2 text-[0.88rem]">
            <FileDown size={16} aria-hidden="true" />
            {copy.pdf}
          </AsyncButton>
          {!paid && writable && (
            <button type="button" onClick={() => setDialog(true)} className="btn btn-ghost px-4 py-2 text-[0.88rem]">
              <Check size={16} aria-hidden="true" />
              {copy.paid}
            </button>
          )}
          {paid && writable && (
            <AsyncButton
              type="button"
              onClick={async () => {
                await api.unmarkGuidePaid(g.id).catch(() => undefined);
                onChange();
              }}
              className="btn px-3 py-2 text-[0.86rem] text-muted hover:text-ink"
            >
              <Undo2 size={15} aria-hidden="true" />
              {copy.undo}
            </AsyncButton>
          )}
          <a
            href={whatsappLink(g.status === "OVERDUE" ? copy.overdueMessage(name) : copy.askMessage(name, formatDay(g.dueDate)))}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-[0.84rem] text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            <MessageCircle size={15} aria-hidden="true" />
            {copy.ask}
          </a>
        </div>
        {g.status === "OVERDUE" && <p className="mt-3 text-[0.84rem] text-brand">{copy.overdueHelp}</p>}
      </div>

      {dialog && <PaidDialog g={g} onClose={() => setDialog(false)} onDone={onChange} />}
    </article>
  );
}

function Barcode({ barcode }: { barcode: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!barcode) return <p className="mt-5 max-w-[56ch] rounded-xl bg-surface-2 px-4 py-3 text-[0.88rem] text-muted">{copy.noBarcode}</p>;
  const groups = formatBarcodeLine(barcode).split(" ");

  async function copyLine() {
    try {
      await navigator.clipboard.writeText(barcode!);
    } catch {
      // Older browsers: select the text so the person can copy it by hand.
      const range = document.createRange();
      range.selectNodeContents(document.getElementById(`linha-${barcode}`)!);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="mt-5">
      <p className="text-[0.8rem] text-faint">{copy.barcode}</p>
      <div className="mt-1.5 flex flex-col gap-3 rounded-xl border border-line bg-bg p-3 sm:flex-row sm:items-center">
        <p id={`linha-${barcode}`} className="flex-1 font-mono text-[0.92rem] leading-relaxed tracking-[0.02em] text-ink [word-spacing:0.35em]">
          {groups.join(" ")}
        </p>
        <AsyncButton type="button" onClick={copyLine} className="btn btn-primary shrink-0 px-5 py-2.5 text-[0.9rem]" aria-live="polite">
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? copy.copied : copy.copy}
        </AsyncButton>
      </div>
      <p className="mt-1.5 text-[0.8rem] text-faint">{copy.copyHint}</p>
    </div>
  );
}

function PaidDialog({ g, onClose, onDone }: { g: PortalGuide; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<PortalFile | null>(null);
  const [busy, setBusy] = useState(false);
  const { uploads, upload, dismiss, busy: uploading } = useUpload();
  const d = copy.paidDialog;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function confirm() {
    setBusy(true);
    try {
      await api.markGuidePaid(g.id, { receiptFileId: receipt?.id });
      onDone();
      onClose();
    } catch {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-navy/40"
    >
      <div className="p-6">
        <h2 className="font-serif text-[1.4rem] font-semibold">{d.title}</h2>
        <p className="mt-1 text-[0.9rem] text-muted">
          {guideName(g)}, {formatBRLExact(g.amountCents)}
        </p>
        <p className="mt-4 text-[0.92rem] text-muted">{d.text}</p>
        {receipt ? (
          <p className="mt-4 rounded-xl bg-ok-tint px-3 py-2 text-[0.88rem]">{d.attached(receipt.fileName)}</p>
        ) : (
          <>
            <button type="button" onClick={() => file.current?.click()} className="btn btn-ghost mt-4 px-4 py-2 text-[0.88rem]" aria-busy={uploading} disabled={uploading}>
              <Paperclip size={15} aria-hidden="true" />
              {d.attach}
            </button>
            <input
              ref={file}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label={d.attach}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const [done] = await upload([f], { purpose: "receipt", guideId: g.id });
                if (done) setReceipt(done);
              }}
            />
            <UploadProgress uploads={uploads} onDismiss={dismiss} />
          </>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="btn btn-ghost px-4 py-2.5 text-[0.9rem]">{d.cancel}</button>
          <button type="button" onClick={confirm} aria-busy={busy || uploading} disabled={busy || uploading} className="btn btn-primary px-5 py-2.5 text-[0.9rem]">{d.confirm}</button>
        </div>
      </div>
    </dialog>
  );
}
