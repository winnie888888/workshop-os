/**
 * StoragePort — the backend-agnostic contract for the file store. The
 * attachments service depends only on this interface, never on a concrete
 * provider, so the same upload/download logic runs against S3-compatible object
 * storage in production and a local filesystem in development. This is the
 * clean/hexagonal boundary the rest of the system uses for every external
 * dependency (Minimax, e-invoicing, the AI gateway), applied to storage.
 */

export interface PresignedUpload {
  /** The URL the client PUTs the bytes to. */
  url: string;
  /** HTTP method to use (always PUT for the providers here). */
  method: 'PUT';
  /** Headers the client must send with the upload (e.g. Content-Type). */
  headers: Record<string, string>;
  /** When the URL stops working (epoch ms). */
  expiresAt: number;
}

export interface PresignedDownload {
  url: string;
  expiresAt: number;
}

export interface StoragePort {
  /**
   * Issue a time-limited URL the client uses to upload bytes directly to the
   * store (so large files never pass through the API process). The key is built
   * by the caller from trusted parts; the provider does not see the filename.
   */
  presignUpload(input: {
    key: string;
    contentType: string;
    maxBytes: number;
  }): Promise<PresignedUpload>;

  /** Issue a time-limited URL the client uses to download/view the object. */
  presignDownload(input: { key: string; downloadFilename?: string }): Promise<PresignedDownload>;

  /** Confirm an object exists and return its size — used to verify an upload. */
  head(key: string): Promise<{ exists: boolean; byteSize?: number; contentType?: string }>;

  /** Remove an object (soft-delete at the DB level still keeps the row). */
  remove(key: string): Promise<void>;
}

/** DI token for the active storage adapter. */
export const STORAGE_PORT = Symbol('STORAGE_PORT');
