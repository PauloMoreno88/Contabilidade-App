import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { StorageProvider } from './storage-provider.js';

export type LocalTicket = { k: string; op: 'put' | 'get'; ct: string; fn?: string; inline?: boolean; exp: number };

/**
 * Dev and tests only (never in production): files on disk under STORAGE_LOCAL_DIR, with URLs signed
 * by the API itself and served by LocalStorageController. Same flow as R2, so the front does not change.
 */
export class LocalStorageProvider extends StorageProvider {
  readonly configured = true;
  readonly dir = resolve(process.env.STORAGE_LOCAL_DIR || '.storage');
  private readonly secret = process.env.BETTER_AUTH_SECRET ?? 'dev';

  private apiBase() {
    return (process.env.BETTER_AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  }

  path(key: string) {
    const p = resolve(this.dir, key);
    if (!p.startsWith(this.dir + sep)) throw new Error('Invalid key');
    return p;
  }

  sign(ticket: LocalTicket) {
    const body = Buffer.from(JSON.stringify(ticket)).toString('base64url');
    return `${body}.${createHmac('sha256', this.secret).update(body).digest('base64url')}`;
  }

  /** The ticket of a valid, unexpired token, or null. */
  verify(token: string): LocalTicket | null {
    const [body, mac] = token.split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest();
    const given = Buffer.from(mac, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const t = JSON.parse(Buffer.from(body, 'base64url').toString()) as LocalTicket;
    return t.exp > Date.now() ? t : null;
  }

  async presignPut(key: string, contentType: string, expiresInSeconds: number) {
    const token = this.sign({ k: key, op: 'put', ct: contentType, exp: Date.now() + expiresInSeconds * 1000 });
    return { url: `${this.apiBase()}/storage/local/${token}`, headers: { 'Content-Type': contentType } };
  }

  async presignGet(key: string, opts: { fileName: string; contentType: string; inline: boolean }, expiresInSeconds: number) {
    const token = this.sign({ k: key, op: 'get', ct: opts.contentType, fn: opts.fileName, inline: opts.inline, exp: Date.now() + expiresInSeconds * 1000 });
    return `${this.apiBase()}/storage/local/${token}`;
  }

  async head(key: string) {
    try {
      return { sizeBytes: (await stat(this.path(key))).size };
    } catch {
      return null;
    }
  }

  async get(key: string) {
    return new Uint8Array(await readFile(this.path(key)));
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }

  async ensureDir(key: string) {
    await mkdir(dirname(this.path(key)), { recursive: true });
  }
}
