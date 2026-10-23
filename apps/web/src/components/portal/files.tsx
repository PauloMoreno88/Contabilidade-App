"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, Loader2, Paperclip, Trash2, X } from "lucide-react";
import type { PortalFile } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { formatBytes, formatDate } from "@/lib/format";
import type { UploadState } from "./useUpload";

const copy = portalCopy.documents;

/** Opens a signed URL in a new tab. The tab opens first (inside the click) so popup blockers let it through. */
export async function openSigned(getUrl: () => Promise<{ url: string }>) {
  const tab = window.open("", "_blank");
  try {
    const { url } = await getUrl();
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch {
    tab?.close();
  }
}

export function FileList({ files, onOpen, onRemove }: { files: PortalFile[]; onOpen: (f: PortalFile) => void; onRemove?: (f: PortalFile) => void }) {
  if (!files.length) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {files.map((f) => {
        const Icon = f.contentType.startsWith("image/") ? ImageIcon : FileText;
        return (
          <li key={f.id} className="flex items-center gap-3 rounded-xl bg-surface-2/70 px-3 py-2 text-[0.88rem]">
            <Icon size={17} className="shrink-0 text-navy-3" aria-hidden="true" />
            <button type="button" onClick={() => onOpen(f)} className="min-w-0 flex-1 truncate text-left font-medium underline-offset-2 hover:underline" title={copy.open}>
              {f.fileName}
            </button>
            <span className="hidden shrink-0 text-[0.78rem] text-faint sm:inline">
              {copy.sentBy[f.uploadedBy]} em {formatDate(f.uploadedAt)}, {formatBytes(f.sizeBytes)}
            </span>
            {onRemove && f.canDelete && (
              <button
                type="button"
                onClick={() => window.confirm(copy.removeConfirm(f.fileName)) && onRemove(f)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-3 hover:text-ink"
                aria-label={`${copy.remove} ${f.fileName}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function UploadProgress({ uploads, onDismiss }: { uploads: UploadState[]; onDismiss: (key: string) => void }) {
  if (!uploads.length) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5" aria-live="polite">
      {uploads.map((u) =>
        u.error ? (
          <li key={u.key} role="alert" className="flex items-start gap-2 rounded-xl bg-brand-tint px-3 py-2 text-[0.86rem] text-brand-dark">
            <span className="flex-1">{u.error}</span>
            <button type="button" onClick={() => onDismiss(u.key)} aria-label="Fechar" className="shrink-0">
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ) : (
          <li key={u.key} className="rounded-xl bg-surface-2/70 px-3 py-2 text-[0.86rem]">
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="truncate">{copy.uploading(u.name)}</span>
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full bg-navy transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * File picker + camera (phones) + drag and drop (desktop) around `children`.
 * `onFiles` gets everything picked or dropped.
 */
export function DropTarget({
  onFiles,
  disabled,
  label,
  hasFiles,
  children,
  className = "",
}: {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
  label: string;
  hasFiles?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <div
      className={`relative ${className}`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      {!disabled && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} className="btn btn-navy px-4 py-2 text-[0.86rem]">
            <Paperclip size={15} aria-hidden="true" />
            {hasFiles ? copy.uploadMore : copy.upload}
          </button>
          <button type="button" onClick={() => camera.current?.click()} className="btn btn-ghost px-4 py-2 text-[0.86rem] sm:hidden">
            <Camera size={15} aria-hidden="true" />
            {copy.camera}
          </button>
          <input ref={input} type="file" multiple className="sr-only" aria-label={label} onChange={pick} tabIndex={-1} />
          <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" aria-label={`${copy.camera}: ${label}`} onChange={pick} tabIndex={-1} />
        </div>
      )}
      {over && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl border-2 border-dashed border-navy bg-surface/90 text-[0.95rem] font-semibold">
          {copy.drop}
        </div>
      )}
    </div>
  );
}
