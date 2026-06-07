/**
 * S3 storage adapter — the production file store. It targets any S3-compatible
 * service (AWS S3, but equally MinIO or a European provider such as OVH or
 * Scaleway, which matters for data residency), and issues presigned URLs so the
 * browser uploads bytes straight to the bucket without streaming them through
 * the API. The API process therefore never holds large files in memory, which
 * is what makes uploads from a phone on a bay scale.
 *
 * Residency note: the bucket and region are configured to an EU location for
 * the pilot, consistent with the AI gateway's EU-residency posture.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StoragePort, PresignedUpload, PresignedDownload } from './storage.port';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  /** Custom endpoint for non-AWS S3 (MinIO/OVH/Scaleway); empty for AWS. */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Path-style addressing is required by most non-AWS S3 implementations. */
  forcePathStyle?: boolean;
  /** Signed URL lifetime in seconds. */
  signedUrlTtlSeconds: number;
}

export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;

  constructor(private readonly cfg: S3StorageConfig) {
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: cfg.forcePathStyle ?? Boolean(cfg.endpoint),
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async presignUpload(input: { key: string; contentType: string; maxBytes: number }): Promise<PresignedUpload> {
    // The signed PUT pins the content type; the bucket policy enforces the size
    // ceiling (and we re-check via head() on completion as defence in depth).
    const cmd = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: this.cfg.signedUrlTtlSeconds });
    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      expiresAt: Date.now() + this.cfg.signedUrlTtlSeconds * 1000,
    };
  }

  async presignDownload(input: { key: string; downloadFilename?: string }): Promise<PresignedDownload> {
    const cmd = new GetObjectCommand({
      Bucket: this.cfg.bucket,
      Key: input.key,
      ResponseContentDisposition: input.downloadFilename
        ? `inline; filename="${input.downloadFilename}"`
        : undefined,
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: this.cfg.signedUrlTtlSeconds });
    return { url, expiresAt: Date.now() + this.cfg.signedUrlTtlSeconds * 1000 };
  }

  async head(key: string): Promise<{ exists: boolean; byteSize?: number; contentType?: string }> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
      return { exists: true, byteSize: res.ContentLength, contentType: res.ContentType };
    } catch {
      return { exists: false };
    }
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }
}
