import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Put, Req, Res } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { createReadStream, createWriteStream } from 'node:fs';
import { PORTAL_RULES } from '@exactra/shared';
import { LocalStorageProvider } from './local.provider.js';
import { StorageProvider, contentDisposition } from './storage-provider.js';

/** Upload/download endpoints behind LocalStorageProvider's signed URLs. Not registered in production. */
@AllowAnonymous()
@Controller('storage/local')
export class LocalStorageController {
  constructor(private readonly storage: StorageProvider) {}

  private ticket(token: string, op: 'put' | 'get') {
    if (!(this.storage instanceof LocalStorageProvider)) throw new NotFoundException();
    const t = this.storage.verify(token);
    if (!t || t.op !== op) throw new ForbiddenException();
    return { t, storage: this.storage };
  }

  @Put(':token')
  async put(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
    const { t, storage } = this.ticket(token, 'put');
    if (req.headers['content-type'] !== t.ct) throw new BadRequestException('Content-Type mismatch');
    await storage.ensureDir(t.k);
    let size = 0;
    const out = createWriteStream(storage.path(t.k));
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > PORTAL_RULES.maxUploadBytes) req.destroy();
    });
    req.pipe(out);
    out.on('finish', () => res.status(200).end());
    out.on('error', () => res.status(500).end());
    req.on('close', () => size > PORTAL_RULES.maxUploadBytes && !res.headersSent && res.status(413).end());
  }

  @Get(':token')
  get(@Param('token') token: string, @Res() res: Response) {
    const { t, storage } = this.ticket(token, 'get');
    res.setHeader('Content-Type', t.ct);
    res.setHeader('Content-Disposition', contentDisposition(t.fn ?? 'arquivo', Boolean(t.inline)));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(storage.path(t.k))
      .on('error', () => res.status(404).end())
      .pipe(res);
  }
}
