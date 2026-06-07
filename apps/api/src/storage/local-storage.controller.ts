/**
 * Local-storage route — the endpoint that the LocalStorageAdapter's signed URLs
 * target in development. It validates the HMAC signature and expiry before
 * accepting a PUT (upload) or serving a GET (download). In production the
 * storage driver is S3 and this route simply never receives signed URLs.
 *
 * It is intentionally exempt from tenant auth (the signature IS the auth), so
 * the middleware config excludes `storage/local`.
 */

import {
  Controller, Get, Put, Query, Req, Res, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Inject } from '@nestjs/common';
import { STORAGE_PORT } from './storage.port';
import { LocalStorageAdapter } from './local.adapter';

@Controller('storage/local')
export class LocalStorageController {
  constructor(@Inject(STORAGE_PORT) private readonly storage: unknown) {}

  private get local(): LocalStorageAdapter {
    if (!(this.storage instanceof LocalStorageAdapter)) {
      throw new ForbiddenException('Local storage route is not active');
    }
    return this.storage;
  }

  @Put()
  async upload(@Query() q: Record<string, string>, @Req() req: Request): Promise<{ ok: true }> {
    this.assertSig(q, 'put');
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    await this.local.write(q.key, Buffer.concat(chunks));
    return { ok: true };
  }

  @Get()
  async download(@Query() q: Record<string, string>, @Res() res: Response): Promise<void> {
    this.assertSig(q, 'get');
    const head = await this.local.head(q.key);
    if (!head.exists) {
      res.status(404).json({ title: 'Not found' });
      return;
    }
    const data = await this.local.read(q.key);
    if (q.filename) res.setHeader('Content-Disposition', `inline; filename="${q.filename}"`);
    res.send(data);
  }

  private assertSig(q: Record<string, string>, op: 'put' | 'get'): void {
    const exp = parseInt(q.exp ?? '0', 10);
    if (!q.key || !q.sig || !exp) throw new BadRequestException('Malformed signed URL');
    if (!this.local.verify(q.key, exp, op, q.sig)) {
      throw new ForbiddenException('Invalid or expired signature');
    }
  }
}
