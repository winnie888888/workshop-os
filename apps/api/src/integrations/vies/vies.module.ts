import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { VAT_ID_VALIDATION_PORT } from './vat-id-validation.port';
import { ViesRestAdapter } from './vies-rest.adapter';
import { ViesUnavailableAdapter } from './vies-unavailable.adapter';

/**
 * Wires the VAT-id validation port. If VIES_BASE_URL is configured we bind the
 * real REST adapter; otherwise we bind the unavailable adapter, which routes the
 * advisor to an audited manual confirmation. The choice is made once at boot
 * from config, so the rest of the system depends only on the port token.
 */
@Module({
  providers: [
    ViesRestAdapter,
    ViesUnavailableAdapter,
    {
      provide: VAT_ID_VALIDATION_PORT,
      inject: [AppConfig, ViesRestAdapter, ViesUnavailableAdapter],
      useFactory: (config: AppConfig, real: ViesRestAdapter, fallback: ViesUnavailableAdapter) =>
        config.viesBaseUrl ? real : fallback,
    },
  ],
  exports: [VAT_ID_VALIDATION_PORT],
})
export class ViesModule {}
