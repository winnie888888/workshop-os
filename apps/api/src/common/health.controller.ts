import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PgService } from './db/pg.service';

/**
 * Health sonde za load-balancer / orchestrator (k8s, compose healthcheck).
 *  - GET /health        liveness: proces teče (NE preverja odvisnosti). Če to
 *                       pade, naj orchestrator instanco ponovno zažene.
 *  - GET /health/ready  readiness: instanca je pripravljena sprejeti promet
 *                       (preveri DB povezavo). Pri težavi vrne HTTP 503, da LB
 *                       NE usmerja prometa sem, dokler se ne opomore.
 *
 * @SkipThrottle: sonde se kličejo pogosto (vsakih nekaj s); ne smejo trošiti
 * rate-limit kvote (sicer bi monitoring sam sprožil 429).
 */
@SkipThrottle()
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
      // HTTP 503: signal LB-ju, da instanca (zaenkrat) ni za promet. Vrnjeni
      // body je informativen; ključen je ne-2xx status.
      throw new ServiceUnavailableException({ status: 'degraded' });
    }
  }
}
