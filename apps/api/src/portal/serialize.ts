import {
  currentDocumentsCompetence,
  guideStatus,
  type PortalFile,
  type PortalGuide,
  type RejectionReason,
  type DocumentRequest as DocumentRequestDto,
} from '@exactra/shared';
import type { DocumentRequest, StoredFile, TaxGuide } from '../generated/prisma/client.js';

/** @db.Date columns come back as UTC midnight: keep the calendar day. */
export const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
export const fromDateOnly = (s: string) => new Date(`${s}T00:00:00Z`);

/** Customers can fix their own files while the month is still being collected; never the team's files. */
export function canDeleteFile(f: StoredFile, writable: boolean): boolean {
  return writable && !f.byStaff && f.kind !== 'GUIDE' && f.competence >= currentDocumentsCompetence();
}

export function toPortalFile(f: StoredFile, writable = false): PortalFile {
  return {
    id: f.id,
    fileName: f.fileName,
    contentType: f.contentType,
    sizeBytes: f.sizeBytes,
    uploadedAt: (f.uploadedAt ?? f.createdAt).toISOString(),
    uploadedBy: f.byStaff ? 'exactra' : 'customer',
    canDelete: canDeleteFile(f, writable),
  };
}

export function toDocumentRequest(r: DocumentRequest & { files: StoredFile[] }, writable = false): DocumentRequestDto {
  return {
    id: r.id,
    competence: r.competence,
    title: r.title,
    description: r.description,
    required: r.required,
    dueDate: dateOnly(r.dueDate),
    status: r.status,
    rejection:
      r.status === 'REJECTED' && r.rejectionReason
        ? { reason: r.rejectionReason as RejectionReason, note: r.rejectionNote, at: (r.rejectedAt ?? r.createdAt).toISOString() }
        : null,
    files: r.files.filter((f) => f.uploadedAt).map((f) => toPortalFile(f, writable)),
  };
}

export type GuideWithFiles = TaxGuide & { file: StoredFile; receipt: StoredFile | null };

export function toPortalGuide(g: GuideWithFiles, now = new Date()): PortalGuide {
  const dueDate = dateOnly(g.dueDate);
  return {
    id: g.id,
    type: g.type,
    label: g.label,
    competence: g.competence,
    amountCents: g.amountCents,
    dueDate,
    barcode: g.barcode,
    status: guideStatus({ paidAt: g.paidAt, dueDate }, now),
    paidAt: g.paidAt?.toISOString() ?? null,
    publishedAt: g.publishedAt.toISOString(),
    file: toPortalFile(g.file),
    receipt: g.receipt ? toPortalFile(g.receipt) : null,
  };
}
