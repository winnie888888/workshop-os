import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { HttpLlmProvider } from './http-llm.provider';
import { FixtureLlmProvider } from './fixture-llm.provider';
import { AppConfig } from '../config/configuration';
import { LLM_PROVIDER } from './ai-gateway.port';

/**
 * Provider selection is config-driven (same pattern as the VIES integration).
 * When a real EU-resident model endpoint is configured (AI_PROVIDER_BASE_URL +
 * AI_DEFAULT_MODEL), the gateway uses the HTTP provider, which supports both
 * text completion and multimodal document extraction. Otherwise it falls back to
 * the deterministic fixture provider, so the whole OCR receiving flow remains
 * exercisable offline and in the mobile demo. The business logic above the
 * gateway never changes between the two.
 */
@Module({
  providers: [
    HttpLlmProvider,
    FixtureLlmProvider,
    {
      provide: LLM_PROVIDER,
      inject: [AppConfig, HttpLlmProvider, FixtureLlmProvider],
      useFactory: (config: AppConfig, http: HttpLlmProvider, fixture: FixtureLlmProvider) =>
        config.aiProviderBaseUrl && config.aiDefaultModel ? http : fixture,
    },
    AiGatewayService,
  ],
  exports: [AiGatewayService],
})
export class AiModule {}
