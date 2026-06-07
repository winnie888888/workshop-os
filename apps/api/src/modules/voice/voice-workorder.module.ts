import { Module } from '@nestjs/common';
import { VoiceWorkOrderController } from './voice-workorder.controller';
import { VoiceWorkOrderService } from './voice-workorder.service';
import { AiModule } from '../../ai/ai-gateway.module';
import { WorkOrdersModule } from '../workorders/work-orders.module';
import { AttachmentsRepository } from '../attachments/attachments.repository';

/**
 * Voice work-order module. Composes existing capabilities, exactly like the plate
 * module:
 *   - AiModule provides the gateway (transcription + extraction, with residency
 *     and provenance).
 *   - WorkOrdersModule exports WorkOrdersService (the existing create/addLine
 *     workflow — voice only ever delegates to it, on human confirm).
 *   - AttachmentsRepository reads the uploaded audio's storage key.
 * The global CommonModule supplies PgService and AuditService.
 */
@Module({
  imports: [AiModule, WorkOrdersModule],
  controllers: [VoiceWorkOrderController],
  providers: [VoiceWorkOrderService, AttachmentsRepository],
})
export class VoiceModule {}
