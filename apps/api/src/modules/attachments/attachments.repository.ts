import { Injectable } from '@nestjs/common';
import type { TxClient } from '../../common/db/pg.service';

/**
 * Attachments repository — tenant-scoped reads/writes over app.attachments.
 * Every query runs inside a withTenant transaction, so Postgres RLS guarantees
 * a tenant can only ever see or touch its own files; this layer never filters
 * by tenant in SQL because the database already does.
 */

export interface AttachmentRow {
  id: string;
  workOrderId: string | null;
  kind: string;
  storageKey: string;
  contentType: string;
  byteSize: string;
  checksumSha256: string | null;
  originalFilename: string | null;
  transcript: string | null;
  status: string;
  uploadedBy: string | null;
  createdAt: string;
  storedAt: string | null;
}

@Injectable()
export class AttachmentsRepository {
  /** Insert a pending attachment when an upload URL is issued. */
  async insertPending(
    tx: TxClient,
    input: {
      id: string; workOrderId: string | null; kind: string; storageKey: string;
      contentType: string; byteSize: number; originalFilename: string | null;
      transcript: string | null; uploadedBy: string | null;
    },
  ): Promise<AttachmentRow> {
    const res = await tx.query<any>(
      `INSERT INTO app.attachments
         (id, tenant_id, work_order_id, kind, storage_key, content_type, byte_size,
          original_filename, transcript, status, uploaded_by)
       VALUES ($1, current_setting('app.current_tenant_id', true)::uuid, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING *`,
      [
        input.id, input.workOrderId, input.kind, input.storageKey, input.contentType,
        String(input.byteSize), input.originalFilename, input.transcript, input.uploadedBy,
      ],
    );
    return this.map(res.rows[0]);
  }

  async get(tx: TxClient, id: string): Promise<AttachmentRow | null> {
    const res = await tx.query<any>(`SELECT * FROM app.attachments WHERE id = $1`, [id]);
    return res.rowCount ? this.map(res.rows[0]) : null;
  }

  /** Mark a pending attachment as stored after the client confirms the upload. */
  async markStored(
    tx: TxClient,
    id: string,
    input: { checksumSha256: string | null; byteSize?: number; transcript?: string | null },
  ): Promise<AttachmentRow | null> {
    const res = await tx.query<any>(
      `UPDATE app.attachments
          SET status = 'stored',
              stored_at = now(),
              checksum_sha256 = COALESCE($2, checksum_sha256),
              byte_size = COALESCE($3, byte_size),
              transcript = COALESCE($4, transcript)
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [id, input.checksumSha256, input.byteSize != null ? String(input.byteSize) : null,
       input.transcript ?? null],
    );
    return res.rowCount ? this.map(res.rows[0]) : null;
  }

  /** List stored attachments for a work order (newest first). */
  async listForWorkOrder(tx: TxClient, workOrderId: string): Promise<AttachmentRow[]> {
    const res = await tx.query<any>(
      `SELECT * FROM app.attachments
        WHERE work_order_id = $1 AND status = 'stored'
        ORDER BY created_at DESC`,
      [workOrderId],
    );
    return res.rows.map((r: any) => this.map(r));
  }

  private map(r: any): AttachmentRow {
    return {
      id: r.id, workOrderId: r.work_order_id, kind: r.kind, storageKey: r.storage_key,
      contentType: r.content_type, byteSize: String(r.byte_size),
      checksumSha256: r.checksum_sha256, originalFilename: r.original_filename,
      transcript: r.transcript, status: r.status, uploadedBy: r.uploaded_by,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      storedAt: r.stored_at ? (r.stored_at instanceof Date ? r.stored_at.toISOString() : String(r.stored_at)) : null,
    };
  }
}
