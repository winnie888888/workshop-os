import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';

/**
 * Attachments module. Depends on the global CommonModule (PgService,
 * AuditService) and the global StorageModule (STORAGE_PORT), so it only needs
 * to declare its own controller, service, and repository.
 */
@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
