/**
 * Local filesystem storage adapter — the development file store. It writes
 * objects under a configured directory and issues HMAC-signed, time-limited
 * URLs that point at the API's own local-storage route (storage.local-route),
 * which verifies the signature before streaming the file. This lets the whole
 * upload/download workflow run end-to-end on a developer's machine with no S3
 * or cloud account, while behaving like the production presigned-URL flow.
 *
 * It is explicitly NOT for production: there is no redundancy and the API
 * process serves the bytes. The storage module refuses to select it when
 * NODE_ENV is production.
 */

import { createHmac } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import type { StoragePort, PresignedUpload, PresignedDownload } from './storage.port';

export interface LocalStorageConfig {
  baseDir: string;          // where objects are written
  publicBaseUrl: string;    // API origin, used to build local URLs
  signingSecret: string;    // HMAC secret for local signed URLs
  signedUrlTtlSeconds: number;
}

export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly cfg: LocalStorageConfig) {}

  private sign(key: string, exp: number, op: 'put' | 'get'): string {
    return createHmac('sha256', this.cfg.signingSecret)
      .update(`${op}:${key}:${exp}`)
      .digest('hex');
  }

  /** Used by the local-storage route to validate an incoming signed request. */
  verify(key: string, exp: number, op: 'put' | 'get', sig: string): boolean {
    if (Date.now() > exp) return false;
    const expected = this.sign(key, exp, op);
    // Constant-time-ish comparison via length + value check.
    return sig.length === expected.length && sig === expected;
  }

  private buildUrl(key: string, op: 'put' | 'get', filename?: string): { url: string; exp: number } {
    const exp = Date.now() + this.cfg.signedUrlTtlSeconds * 1000;
    const sig = this.sign(key, exp, op);
    const params = new URLSearchParams({ key, exp: String(exp), op, sig });
    if (filename) params.set('filename', filename);
    return { url: `${this.cfg.publicBaseUrl}/storage/local?${params.toString()}`, exp };
  }

  async presignUpload(input: { key: string; contentType: string }): Promise<PresignedUpload> {
    const { url, exp } = this.buildUrl(input.key, 'put');
    return { url, method: 'PUT', headers: { 'Content-Type': input.contentType }, expiresAt: exp };
  }

  async presignDownload(input: { key: string; downloadFilename?: string }): Promise<PresignedDownload> {
    const { url, exp } = this.buildUrl(input.key, 'get', input.downloadFilename);
    return { url, expiresAt: exp };
  }

  // --- Filesystem operations used by the local-storage route ---

  private pathFor(key: string): string {
    return join(this.cfg.baseDir, key);
  }

  async write(key: string, data: Buffer): Promise<void> {
    const p = this.pathFor(key);
    await fs.mkdir(dirname(p), { recursive: true });
    await fs.writeFile(p, data);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.pathFor(key));
  }

  async head(key: string): Promise<{ exists: boolean; byteSize?: number }> {
    try {
      const st = await fs.stat(this.pathFor(key));
      return { exists: true, byteSize: st.size };
    } catch {
      return { exists: false };
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.pathFor(key));
    } catch {
      /* already gone */
    }
  }
}
