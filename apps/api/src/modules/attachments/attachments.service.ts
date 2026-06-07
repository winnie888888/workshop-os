import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AttachmentPolicy, StorageKey, getContext, newId } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { STORAGE_PORT, type StoragePort } from '../../storage/storage.port';
import { AttachmentsRepository, type AttachmentRow } from './attachments.repository';

/**
 * Attachments service — the orchestration behind the photo and voice-note
 * workflows. It is deliberately thin glue around proven pieces: the shared
 * AttachmentPolicy decides what may be uploaded, the shared StorageKey builds a
 * safe object key, the StoragePort issues the presigned URL, the repository
 * persists the row under RLS, and the AuditService records every step on the
 * tamper-evident chain (item 10, audit logging for uploads).
 *
 * The flow is two-step by design, mirroring how object stores work:
 *   1. presign  — validate, create a 'pending' row, return an upload URL.
 *   2. complete — the client confirms the bytes landed; we verify with head(),
 *                 flip the row to 'stored', and audit it.
 * Direct streaming through the API is avoided so phone uploads scale.
 */
@Injectable()
export class AttachmentsService {
  constructor(
    private readonly pg: PgService,
    private readonly audit: AuditService,
    private readonly repo: AttachmentsRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async presign(input: {
    workOrderId?: string; kind: string; filename: string; contentType: string; byteSize: number;
  }) {
    // 1. Validate against the shared policy (tested core). Reject early.
    const verdict = AttachmentPolicy.validateAttachment({
      kind: input.kind, contentType: input.contentType, byteSize: input.byteSize,
    });
    if (!verdict.ok || !verdict.extension) {
      throw new BadRequestException(verdict.reason ?? 'Attachment rejected by policy');
    }

    const ctx = getContext();
    const id = newId();
    const key = StorageKey.buildObjectKey({
      tenantId: ctx.tenantId, kind: input.kind, objectId: id, extension: verdict.extension,
    });

    // 2. Persist the pending row (RLS-scoped) and audit the intent.
    const row = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const created = await this.repo.insertPending(tx, {
        id, workOrderId: input.workOrderId ?? null, kind: input.kind, storageKey: key,
        contentType: input.contentType, byteSize: input.byteSize,
        originalFilename: StorageKey.sanitizeFilename(input.filename),
        transcript: null, uploadedBy: ctx.userId,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'attachment.presigned',
        entityType: 'attachment', entityId: id,
        before: null, after: { kind: input.kind, storageKey: key, byteSize: input.byteSize, workOrderId: input.workOrderId ?? null },
      });
      return created;
    });

    // 3. Issue the presigned upload URL (no bytes touch this process).
    const upload = await this.storage.presignUpload({
      key, contentType: input.contentType, maxBytes: AttachmentPolicy.ATTACHMENT_POLICY[input.kind as AttachmentPolicy.AttachmentKind].maxBytes,
    });

    return {
      attachmentId: row.id,
      storageKey: key,
      upload, // { url, method, headers, expiresAt }
    };
  }

  async complete(id: string, input: { checksumSha256?: string; transcript?: string }) {
    const ctx = getContext();

    // Verify the object actually exists in the store before trusting the client.
    const row = await this.pg.withTenant(ctx.tenantId, (tx) => this.repo.get(tx, id));
    if (!row) throw new NotFoundException('Attachment not found');
    if (!StorageKey.keyBelongsToTenant(row.storageKey, ctx.tenantId)) {
      throw new BadRequestException('Attachment does not belong to this tenant');
    }
    const head = await this.storage.head(row.storageKey);
    if (!head.exists) throw new BadRequestException('Upload not found in storage; PUT may have failed');

    const stored = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const updated = await this.repo.markStored(tx, id, {
        checksumSha256: input.checksumSha256 ?? null,
        byteSize: head.byteSize,
        transcript: input.transcript ?? null,
      });
      if (!updated) return null;
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'attachment.stored',
        entityType: 'attachment', entityId: id,
        before: { status: 'pending' },
        after: { status: 'stored', byteSize: head.byteSize ?? row.byteSize, checksum: input.checksumSha256 ?? null },
      });
      return updated;
    });
    if (!stored) throw new BadRequestException('Attachment was not pending (already completed?)');
    return this.present(stored);
  }

  async listForWorkOrder(workOrderId: string) {
    const ctx = getContext();
    const rows = await this.pg.withTenant(ctx.tenantId, (tx) => this.repo.listForWorkOrder(tx, workOrderId));
    return rows.map((r) => this.present(r));
  }

  /** Issue a short-lived download URL and audit the access (item 10). */
  async downloadUrl(id: string) {
    const ctx = getContext();
    const row = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const r = await this.repo.get(tx, id);
      if (r && r.status === 'stored') {
        await this.audit.append(tx, {
          tenantId: ctx.tenantId, actorId: ctx.userId, action: 'attachment.accessed',
          entityType: 'attachment', entityId: id, before: null, after: { storageKey: r.storageKey },
        });
      }
      return r;
    });
    if (!row || row.status !== 'stored') throw new NotFoundException('Attachment not available');
    const dl = await this.storage.presignDownload({
      key: row.storageKey, downloadFilename: row.originalFilename ?? undefined,
    });
    return { url: dl.url, expiresAt: dl.expiresAt, contentType: row.contentType };
  }

  private present(r: AttachmentRow) {
    // Never leak the raw storage key to clients; they fetch via downloadUrl.
    return {
      id: r.id, workOrderId: r.workOrderId, kind: r.kind, contentType: r.contentType,
      byteSize: r.byteSize, originalFilename: r.originalFilename, transcript: r.transcript,
      status: r.status, createdAt: r.createdAt, storedAt: r.storedAt,
    };
  }
}
