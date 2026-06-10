import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { PgService } from './db/pg.service';
import { AuditService } from './audit/audit.service';
import { OutboxService } from './outbox/outbox.service';
import { CounterService } from './numbering/counter.service';
import { ChangeFeedService } from './sync/change-feed.service';
import { NotifyService } from './notify/notify.service';

/**
 * Global cross-cutting providers. Available to every module without re-import
 * (the modular monolith's shared kernel — Architecture §1.1).
 */
@Global()
@Module({
  providers: [AppConfig, PgService, AuditService, OutboxService, CounterService, ChangeFeedService, NotifyService],
  exports: [AppConfig, PgService, AuditService, OutboxService, CounterService, ChangeFeedService, NotifyService],
})
export class CommonModule {}
