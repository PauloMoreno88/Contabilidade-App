import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  fileExtension,
  PORTAL_RULES,
  retentionDeletionDate,
  todayInSaoPaulo,
  uploadContentType,
  type CreateUploadInput,
  type UploadTicket,
} from '@exactra/shared';
import { prisma } from '../db.js';
import type { FileKind, StoredFile } from '../generated/prisma/client.js';
import type { StorageProvider } from '../storage/storage-provider.js';

const UPLOAD_URL_SECONDS = 10 * 60;
const DOWNLOAD_URL_SECONDS = 5 * 60;

function assertConfigured(storage: StorageProvider) {
  if (!storage.configured) throw new ServiceUnavailableException('Envio de arquivos indisponível no momento.');
}

/** Competences still kept by the retention rule, up to the current month (its documents can go early). */
function assertCompetenceInWindow(competence: string) {
  if (retentionDeletionDate(competence) <= todayInSaoPaulo()) throw new BadRequestException('Esta competência já saiu do período guardado.');
  if (competence > todayInSaoPaulo().slice(0, 7)) throw new BadRequestException('Competência futura.');
}

/**
 * Step 1: records the file (not yet uploaded) and returns a signed PUT URL.
 * The content type comes from the extension, never from the browser.
 */
export async function createUpload(
  storage: StorageProvider,
  input: CreateUploadInput,
  opts: { customerId: string; userId: string; byStaff: boolean },
): Promise<UploadTicket> {
  assertConfigured(storage);
  const contentType = uploadContentType(input.fileName)!;
  let kind: FileKind;
  let competence = input.competence;
  let requestId: string | null = null;

  if (input.purpose === 'document') {
    kind = 'DOCUMENT';
    if (input.requestId) {
      const req = await prisma.documentRequest.findFirst({ where: { id: input.requestId, customerId: opts.customerId } });
      if (!req) throw new NotFoundException('Documento não encontrado.');
      requestId = req.id;
      competence = req.competence;
    }
  } else if (input.purpose === 'receipt') {
    kind = 'RECEIPT';
    const guide = await prisma.taxGuide.findFirst({ where: { id: input.guideId ?? '', customerId: opts.customerId } });
    if (!guide) throw new NotFoundException('Guia não encontrada.');
    competence = guide.competence;
  } else {
    if (!opts.byStaff) throw new BadRequestException('Só a equipe publica guias.');
    if (contentType !== 'application/pdf') throw new BadRequestException('A guia precisa ser um PDF.');
    kind = 'GUIDE';
  }
  if (!competence) throw new BadRequestException('Informe a competência.');
  if (kind === 'DOCUMENT') assertCompetenceInWindow(competence);

  const id = randomBytes(12).toString('hex');
  const storageKey = `customers/${opts.customerId}/${competence}/${id}.${fileExtension(input.fileName)}`;
  const file = await prisma.storedFile.create({
    data: {
      customerId: opts.customerId,
      kind,
      storageKey,
      fileName: input.fileName,
      contentType,
      sizeBytes: input.sizeBytes,
      competence,
      requestId,
      uploadedById: opts.userId,
      byStaff: opts.byStaff,
    },
  });
  const { url, headers } = await storage.presignPut(storageKey, contentType, UPLOAD_URL_SECONDS);
  return { fileId: file.id, url, method: 'PUT', headers };
}

/** Step 2: checks the object really is in the storage (and within the size limit), then marks it uploaded. */
export async function completeUpload(storage: StorageProvider, fileId: string, customerId: string | null): Promise<StoredFile> {
  assertConfigured(storage);
  const file = await prisma.storedFile.findFirst({ where: { id: fileId, ...(customerId ? { customerId } : {}) } });
  if (!file) throw new NotFoundException('Arquivo não encontrado.');
  if (file.uploadedAt) return file;
  const head = await storage.head(file.storageKey);
  if (!head) throw new BadRequestException('O arquivo não chegou. Tente enviar de novo.');
  if (head.sizeBytes > PORTAL_RULES.maxUploadBytes) {
    await storage.delete(file.storageKey);
    await prisma.storedFile.delete({ where: { id: file.id } });
    throw new BadRequestException('Arquivo maior que o limite de 25 MB.');
  }
  return prisma.$transaction(async (tx) => {
    const done = await tx.storedFile.update({ where: { id: file.id }, data: { uploadedAt: new Date(), sizeBytes: head.sizeBytes } });
    if (file.requestId) {
      // A new file answers a rejection too: the request goes back to "sent".
      await tx.documentRequest.update({
        where: { id: file.requestId },
        data: { status: 'SENT', sentAt: new Date(), rejectionReason: null, rejectionNote: null, rejectedAt: null },
      });
    }
    return done;
  });
}

/** Removes a file and, when it was the last one of a checklist item, puts the item back to pending. */
export async function deleteFile(storage: StorageProvider, file: StoredFile) {
  assertConfigured(storage);
  await storage.delete(file.storageKey);
  await prisma.$transaction(async (tx) => {
    await tx.storedFile.delete({ where: { id: file.id } });
    if (file.requestId) {
      const left = await tx.storedFile.count({ where: { requestId: file.requestId, uploadedAt: { not: null } } });
      if (left === 0) await tx.documentRequest.update({ where: { id: file.requestId }, data: { status: 'PENDING', sentAt: null } });
    }
  });
}

/** PDFs and images can open in the browser; everything else downloads. */
export async function downloadUrl(storage: StorageProvider, file: StoredFile, inline: boolean) {
  assertConfigured(storage);
  const viewable = file.contentType === 'application/pdf' || /^image\/(png|jpeg|webp)$/.test(file.contentType);
  return {
    url: await storage.presignGet(file.storageKey, { fileName: file.fileName, contentType: file.contentType, inline: inline && viewable }, DOWNLOAD_URL_SECONDS),
  };
}
