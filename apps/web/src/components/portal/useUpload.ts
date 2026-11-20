"use client";

import { useState } from "react";
import { PORTAL_RULES, uploadContentType, type CreateUploadInput, type PortalFile, type UploadTicket } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { api } from "@/lib/api";

export type UploadState = { key: string; name: string; progress: number; error?: string };
type Target = Omit<CreateUploadInput, "fileName" | "sizeBytes">;

const copy = portalCopy.documents;

/**
 * Three steps per file: ask the API for a signed URL, PUT the file straight to the storage
 * (with progress), confirm. `staff` uses the admin routes (guide PDFs).
 */
export function useUpload(opts: { staff?: boolean; onDone?: (file: PortalFile) => void } = {}) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const patch = (key: string, p: Partial<UploadState>) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));

  async function uploadOne(file: File, target: Target): Promise<PortalFile | null> {
    const key = `${file.name}-${file.size}-${Math.random()}`;
    const fail = (error: string) => {
      setUploads((list) => [...list.filter((u) => u.key !== key), { key, name: file.name, progress: 0, error }]);
      return null;
    };
    if (!uploadContentType(file.name)) return fail(copy.badType(file.name));
    if (file.size > PORTAL_RULES.maxUploadBytes) return fail(copy.tooBig(file.name));

    setUploads((list) => [...list, { key, name: file.name, progress: 0 }]);
    try {
      const input = { ...target, fileName: file.name, sizeBytes: file.size || 1 };
      const ticket: UploadTicket = opts.staff ? await api.adminCreateUpload(input) : await api.createUpload(input);
      await api.putFile(ticket, file, (progress) => patch(key, { progress }));
      const done = opts.staff ? await api.adminCompleteUpload(ticket.fileId) : await api.completeUpload(ticket.fileId);
      setUploads((list) => list.filter((u) => u.key !== key));
      opts.onDone?.(done);
      return done;
    } catch {
      patch(key, { error: copy.uploadError(file.name) });
      return null;
    }
  }

  async function upload(files: FileList | File[], target: Target) {
    const results: (PortalFile | null)[] = [];
    // One at a time: phones on 4G handle sequential uploads better than parallel ones.
    for (const f of Array.from(files)) results.push(await uploadOne(f, target));
    return results.filter((r): r is PortalFile => r !== null);
  }

  const dismiss = (key: string) => setUploads((list) => list.filter((u) => u.key !== key));
  return { uploads, upload, dismiss, busy: uploads.some((u) => !u.error) };
}
