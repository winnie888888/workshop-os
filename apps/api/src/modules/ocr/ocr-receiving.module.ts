import { Module } from '@nestjs/common';
import { OcrReceivingController } from './ocr-receiving.controller';
import { OcrReceivingService } from './ocr-receiving.service';
import { AiModule } from '../../ai/ai-gateway.module';
import { ReceivingModule } from '../receiving/receiving.module';
import { AttachmentsRepository } from '../attachments/attachments.repository';

/**
 * OCR receiving module. It composes existing capabilities rather than
 * duplicating them:
 *   - AiModule provides the gateway (extraction with residency + provenance).
 *   - ReceivingModule exports GoodsReceiptsService (the draft-then-post workflow
 *     and the costed-receive chokepoint sit behind it — OCR only ever drafts).
 *   - AttachmentsRepository is a thin tenant-scoped accessor we declare here to
 *     read the uploaded document's storage key; the attachments module owns the
 *     upload lifecycle, we only read a stored row.
 * The global CommonModule supplies PgService and AuditService.
 */
@Module({
  imports: [AiModule, ReceivingModule],
  controllers: [OcrReceivingController],
  providers: [OcrReceivingService, AttachmentsRepository],
})
export class OcrModule {}
