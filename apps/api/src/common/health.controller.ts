import { Controller, Get } from '@nestjs/common';
import { PgService } from './db/pg.service';

@Controller('health')
export class HealthController {
  constructor(private readonly pg: PgService) {}

  @Get()
  liveness() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.pg.withAdmin((tx) => tx.query('SELECT 1'));
      return { status: 'ready' };
    } catch {
      return { status: 'degraded' };
    }
  }
}
