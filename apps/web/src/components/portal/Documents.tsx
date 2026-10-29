"use client";

import { Loading } from "@/components/common/Loading";
import { feedbackCopy } from "@/config/feedback";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle, Check, Download } from "lucide-react";
import { competenceLabel, competenceSchema, daysUntil, REJECTION_REASONS, type DocumentRequest, type DocumentsMonth, type PortalFile } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { DropTarget, FileList, openSigned, UploadProgress } from "./files";
import { usePortal } from "./PortalShell";
import { LoadState, PageHeader } from "./ui";
import { useUpload } from "./useUpload";

const copy = portalCopy.documents;

/** Monthly checklist: each item takes files straight to the storage; "Outros documentos" takes anything else. */
export function Documents() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("competencia");
  const competence = raw && competenceSchema.safeParse(raw).success ? raw : undefined;
  const month = useLoad(() => api.documents(competence), [competence]);
  const { writable } = usePortal();

  // Links from e-mails and the home page point at one item (#requestId).
  useEffect(() => {
    if (!month.data || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [month.data]);

  const selectMonth = (c: string) => router.replace(`/app/documentos?competencia=${c}`);

  return (
    <>
      {month.data && month.loading && <Loading compact label={feedbackCopy.updating} />}
      <PageHeader title={copy.title} lede={copy.lede}>
        {month.data && month.data.competences.length > 1 && (
          <label className="flex items-center gap-2 text-[0.88rem] text-muted">
            {copy.month}
            <select value={month.data.competence} onChange={(e) => selectMonth(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.92rem] text-ink">
              {month.data.competences.map((c) => (
                <option key={c} value={c}>{competenceLabel(c)}</option>
              ))}
            </select>
          </label>
        )}
      </PageHeader>
      {!month.data ? <LoadState error={month.error} onRetry={month.reload} /> : <Month m={month.data} writable={writable} reload={month.reload} zip={params.get("baixar") === "1"} />}
    </>
  );
}

function Month({ m, writable, reload, zip }: { m: DocumentsMonth; writable: boolean; reload: () => void; zip: boolean }) {
  const days = daysUntil(m.dueDate);
  const required = m.requests.filter((r) => r.required);
  const allSent = required.length > 0 && required.every((r) => r.status === "SENT");
  const late = days < 0 && !allSent;
  const files = [...m.requests.flatMap((r) => r.files), ...m.others];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-[1.35rem] font-semibold first-letter:uppercase">{competenceLabel(m.competence)}</h2>
        <p className={`text-[0.92rem] ${late || days === 0 ? "font-semibold text-brand" : "text-muted"}`}>{allSent ? copy.allSent : copy.due(formatDay(m.dueDate), days)}</p>
      </div>
      {!writable && <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-[0.88rem] text-muted">{copy.readOnly}</p>}

      {m.requests.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {m.requests.map((r) => (
            <li key={r.id} id={r.id} className="scroll-mt-24">
              <RequestItem r={r} writable={writable} onChange={reload} />
            </li>
          ))}
        </ul>
      )}

      <Others m={m} writable={writable} onChange={reload} />

      <footer className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-[0.82rem] text-faint">
        <p>{copy.accepted}</p>
        <p>{copy.retention(formatDay(m.deletesOn))}</p>
        {files.length > 0 && (
          <a href={api.zipUrl(m.competence)} className={`mt-1 inline-flex w-fit items-center gap-2 font-semibold text-ink underline underline-offset-4 ${zip ? "rounded-lg bg-brand-tint px-3 py-2 no-underline" : ""}`}>
            <Download size={15} aria-hidden="true" />
            {copy.downloadAll}
          </a>
        )}
      </footer>
    </>
  );
}

function StatusMark({ status }: { status: DocumentRequest["status"] }) {
  if (status === "SENT")
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok text-white">
        <Check size={16} strokeWidth={2.6} aria-hidden="true" />
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white">
        <AlertCircle size={16} aria-hidden="true" />
      </span>
    );
  return <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-surface-3 bg-bg" aria-hidden="true" />;
}

function RequestItem({ r, writable, onChange }: { r: DocumentRequest; writable: boolean; onChange: () => void }) {
  const { uploads, upload, dismiss } = useUpload({ onDone: onChange });
  const open = (f: PortalFile) => openSigned(() => api.fileUrl(f.id, true));
  const remove = async (f: PortalFile) => {
    await api.deleteFile(f.id).catch(() => undefined);
    onChange();
  };

  return (
    <DropTarget
      onFiles={(files) => upload(files, { purpose: "document", requestId: r.id })}
      disabled={!writable}
      label={r.title}
      hasFiles={r.files.length > 0}
      className={`rounded-2xl border bg-surface p-4 sm:p-5 ${r.status === "REJECTED" ? "border-brand/40" : "border-line"}`}
    >
      <div className="flex gap-3.5">
        <StatusMark status={r.status} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{r.title}</h3>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[0.8rem]">
            <span className={`font-medium ${r.status === "SENT" ? "text-ok" : r.status === "REJECTED" ? "text-brand" : "text-muted"}`}>{copy.status[r.status]}</span>
            <span className="text-faint">{r.required ? copy.required : copy.optional}</span>
          </p>
          {r.description && <p className="mt-1 max-w-[62ch] text-[0.88rem] text-muted">{r.description}</p>}
          {r.rejection && (
            <div className="mt-3 rounded-xl bg-brand-tint px-3.5 py-2.5 text-[0.88rem]">
              <p className="font-semibold text-brand-dark">{copy.rejectedBy}: {REJECTION_REASONS[r.rejection.reason]}</p>
              {r.rejection.note && <p className="mt-0.5 text-ink">{r.rejection.note}</p>}
            </div>
          )}
          <FileList files={r.files} onOpen={open} onRemove={remove} />
          <UploadProgress uploads={uploads} onDismiss={dismiss} />
        </div>
      </div>
    </DropTarget>
  );
}

function Others({ m, writable, onChange }: { m: DocumentsMonth; writable: boolean; onChange: () => void }) {
  const { uploads, upload, dismiss } = useUpload({ onDone: onChange });
  if (!writable && !m.others.length) return null;
  return (
    <section className="mt-8">
      <DropTarget
        onFiles={(files) => upload(files, { purpose: "document", competence: m.competence })}
        disabled={!writable}
        label={copy.othersTitle}
        hasFiles={m.others.length > 0}
        className="rounded-2xl border border-dashed border-line bg-surface/60 p-4 sm:p-5"
      >
        <h3 className="font-semibold">{copy.othersTitle}</h3>
        <p className="mt-1 max-w-[62ch] text-[0.88rem] text-muted">{copy.othersText}</p>
        <FileList
          files={m.others}
          onOpen={(f) => openSigned(() => api.fileUrl(f.id, true))}
          onRemove={async (f) => {
            await api.deleteFile(f.id).catch(() => undefined);
            onChange();
          }}
        />
        <UploadProgress uploads={uploads} onDismiss={dismiss} />
      </DropTarget>
    </section>
  );
}
