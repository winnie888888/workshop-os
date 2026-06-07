import { Module } from '@nestjs/common';
import { PlateRecognitionController } from './plate-recognition.controller';
import { PlateRecognitionService } from './plate-recognition.service';
import { AiModule } from '../../ai/ai-gateway.module';
import { WorkOrdersModule } from '../workorders/work-orders.module';
import { AttachmentsRepository } from '../attachments/attachments.repository';

/**
 * Plate recognition module. Composes existing capabilities, like the OCR module:
 *   - AiModule provides the gateway (plate read with residency + provenance).
 *   - WorkOrdersModule exports WorkOrdersService (the existing, validated create
 *     path — plate recognition only ever delegates to it, on human confirm).
 *   - AttachmentsRepository is the thin tenant-scoped accessor we declare here to
 *     read the uploaded photo's storage key.
 * The global CommonModule supplies PgService and AuditService.
 */
@Module({
  imports: [AiModule, WorkOrdersModule],
  controllers: [PlateRecognitionController],
  providers: [PlateRecognitionService, AttachmentsRepository],
})
export class PlateModule {}
