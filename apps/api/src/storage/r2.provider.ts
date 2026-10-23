import { AwsClient } from 'aws4fetch';
import { contentDisposition, StorageProvider } from './storage-provider.js';

/**
 * Cloudflare R2 (S3 API) through aws4fetch. Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 * The bucket needs a CORS rule allowing PUT and GET from WEB_ORIGIN (docs/deploy-staging.md).
 */
export class R2Provider extends StorageProvider {
  readonly configured = true;
  private readonly client: AwsClient;
  private readonly base: string;

  constructor(env: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; endpoint?: string }) {
    super();
    this.client = new AwsClient({ accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey, service: 's3', region: 'auto' });
    const endpoint = (env.endpoint || `https://${env.accountId}.r2.cloudflarestorage.com`).replace(/\/$/, '');
    this.base = `${endpoint}/${env.bucket}`;
  }

  private url(key: string, params: Record<string, string> = {}) {
    const u = new URL(`${this.base}/${key.split('/').map(encodeURIComponent).join('/')}`);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u;
  }

  async presignPut(key: string, contentType: string, expiresInSeconds: number) {
    const headers = { 'Content-Type': contentType };
    // allHeaders signs Content-Type too: the browser must upload with exactly this type.
    const signed = await this.client.sign(this.url(key, { 'X-Amz-Expires': String(expiresInSeconds) }).toString(), {
      method: 'PUT',
      headers,
      aws: { signQuery: true, allHeaders: true },
    });
    return { url: signed.url, headers };
  }

  async presignGet(key: string, opts: { fileName: string; contentType: string; inline: boolean }, expiresInSeconds: number) {
    const url = this.url(key, {
      'X-Amz-Expires': String(expiresInSeconds),
      'response-content-type': opts.contentType,
      'response-content-disposition': contentDisposition(opts.fileName, opts.inline),
    });
    return (await this.client.sign(url.toString(), { method: 'GET', aws: { signQuery: true } })).url;
  }

  async head(key: string) {
    const res = await this.client.fetch(this.url(key).toString(), { method: 'HEAD' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 HEAD ${res.status}`);
    return { sizeBytes: Number(res.headers.get('content-length') ?? 0) };
  }

  async get(key: string) {
    const res = await this.client.fetch(this.url(key).toString());
    if (!res.ok) throw new Error(`R2 GET ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async delete(key: string) {
    const res = await this.client.fetch(this.url(key).toString(), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}`);
  }
}
