/** Where customer files live. The browser uploads and downloads directly with short-lived signed URLs. */
export abstract class StorageProvider {
  /** False when no storage is configured (uploads answer 503). */
  abstract readonly configured: boolean;
  /** Signed URL for a PUT of exactly this content type. */
  abstract presignPut(key: string, contentType: string, expiresInSeconds: number): Promise<{ url: string; headers: Record<string, string> }>;
  /** Signed URL for a GET. The response type and file name are forced (never what was uploaded). */
  abstract presignGet(key: string, opts: { fileName: string; contentType: string; inline: boolean }, expiresInSeconds: number): Promise<string>;
  /** Size of a stored object, or null when it does not exist. */
  abstract head(key: string): Promise<{ sizeBytes: number } | null>;
  abstract get(key: string): Promise<Uint8Array>;
  abstract delete(key: string): Promise<void>;
}

/** `Content-Disposition` with a plain ASCII fallback and the UTF-8 name (RFC 6266). */
export function contentDisposition(fileName: string, inline: boolean): string {
  const ascii = fileName.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '') || 'arquivo';
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
