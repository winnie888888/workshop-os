import { Module } from '@nestjs/common';
import { WorkshopManagerController } from './workshop-manager.controller';
import { WorkshopManagerService } from './workshop-manager.service';
import { AiModule } from '../../ai/ai-gateway.module';

/**
 * AI Workshop Manager module. It composes only the AI gateway (for the optional,
 * advisory summary narrative); all of its data it reads directly through the
 * global CommonModule's PgService with tenant-scoped SELECTs. It declares no
 * repository with a write path, because the manager never writes to an official
 * record — by construction. AuditService and PgService come from CommonModule.
 */
@Module({
  imports: [AiModule],
  controllers: [WorkshopManagerController],
  providers: [WorkshopManagerService],
})
export class ManagerModule {}
