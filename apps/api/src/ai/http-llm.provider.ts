import { Injectable } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import type { LlmProvider } from './ai-gateway.port';

/**
 * Config-driven LLM provider over a chat-completions-style HTTP API. Real
 * implementation; unconfigured until AI_PROVIDER_BASE_URL / AI_DEFAULT_MODEL
 * are set to an EU-resident endpoint. The gateway treats this as one provider
 * behind its routing/fallback and residency policy.
 */
@Injectable()
export class HttpLlmProvider implements LlmProvider {
  readonly name = 'http-llm';
  readonly residencyRegion: string;

  constructor(private readonly config: AppConfig) {
    this.residencyRegion = config.aiResidency;
  }

  async complete(input: { prompt: string; outputSchema?: string }): Promise<{
    text: string; model: string; confidence: number | null; latencyMs: number; costMicros: number | null;
  }> {
    if (!this.config.aiProviderBaseUrl || !this.config.aiDefaultModel) {
      throw new Error('AI provider not configured (AI_PROVIDER_BASE_URL / AI_DEFAULT_MODEL)');
    }
    const started = Date.now();
    const system = input.outputSchema
      ? `You are a workshop assistant. Respond ONLY with JSON conforming to schema "${input.outputSchema}". No prose, no code fences.`
      : 'You are a workshop assistant.';

    const res = await fetch(`${this.config.aiProviderBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.config.aiDefaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: input.prompt },
        ],
        temperature: 0,
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM provider error ${res.status}`);
    }
    const body = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      text: body.choices?.[0]?.message?.content ?? '',
      model: body.model ?? this.config.aiDefaultModel,
      confidence: null,
      latencyMs: Date.now() - started,
      costMicros: null,
    };
  }
}
