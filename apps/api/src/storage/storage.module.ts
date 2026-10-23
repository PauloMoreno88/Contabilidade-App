import { Logger } from '@nestjs/common';
import { LocalStorageProvider } from './local.provider.js';
import { R2Provider } from './r2.provider.js';
import { StorageProvider } from './storage-provider.js';

/** Storage not configured: every upload/download answers 503 (production without R2). */
class NoStorage extends StorageProvider {
  readonly configured = false;
  private fail(): never {
    throw new Error('Storage is not configured');
  }
  presignPut = async () => this.fail();
  presignGet = async () => this.fail();
  head = async () => this.fail();
  get = async () => this.fail();
  delete = async () => this.fail();
}

/** R2 when its variables are set; local disk in dev and tests; nothing in production. */
export function createStorage(): StorageProvider {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;
  if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && (R2_ACCOUNT_ID || R2_ENDPOINT)) {
    return new R2Provider({
      accountId: R2_ACCOUNT_ID ?? '',
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
      endpoint: R2_ENDPOINT,
    });
  }
  if (process.env.NODE_ENV === 'production') {
    new Logger('Storage').warn('R2 is not configured: uploads and downloads are disabled.');
    return new NoStorage();
  }
  return new LocalStorageProvider();
}

export const useLocalStorage = () => !process.env.R2_BUCKET && process.env.NODE_ENV !== 'production';
