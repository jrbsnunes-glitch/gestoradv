import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from './llm.types';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class LlmService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async getTenantConfig(): Promise<LlmProviderConfig> {
    try {
      const esc = await this.prisma.escritorio.findFirst({
        select: {
          aiProvider: true,
          aiModel: true,
          ollamaBaseUrl: true,
        },
      });
      if (esc) {
        return {
          provider: (esc.aiProvider as LlmProviderConfig['provider']) || 'anthropic',
          model: esc.aiModel,
          ollamaBaseUrl: esc.ollamaBaseUrl,
        };
      }
    } catch {
      /* tenant sem escritório */
    }
    return {
      provider: (this.config.get('AI_PROVIDER') as LlmProviderConfig['provider']) || 'anthropic',
      model: this.config.get('AI_MODEL') || null,
      ollamaBaseUrl: this.config.get('OLLAMA_BASE_URL') || 'http://localhost:11434',
    };
  }

  getProvider(config?: LlmProviderConfig): LlmProvider {
    const cfg = config ?? {
      provider: (this.config.get('AI_PROVIDER') as LlmProviderConfig['provider']) || 'anthropic',
      model: this.config.get('AI_MODEL') || null,
      ollamaBaseUrl: this.config.get('OLLAMA_BASE_URL') || 'http://localhost:11434',
    };

    const anthropicKey = this.config.get('ANTHROPIC_API_KEY') || '';
    const openaiKey = this.config.get('OPENAI_API_KEY') || '';

    if (cfg.provider === 'ollama') {
      return new OllamaProvider(
        cfg.ollamaBaseUrl || 'http://localhost:11434',
        cfg.model || 'llama3.2',
      );
    }

    if (cfg.provider === 'openai' && openaiKey) {
      return new OpenAiProvider(openaiKey, cfg.model || 'gpt-4o-mini');
    }

    if (anthropicKey) {
      return new AnthropicProvider(anthropicKey, cfg.model || 'claude-sonnet-4-20250514');
    }

    if (openaiKey) {
      return new OpenAiProvider(openaiKey, cfg.model || 'gpt-4o-mini');
    }

    return new AnthropicProvider('');
  }

  async isConfigured(): Promise<boolean> {
    const cfg = await this.getTenantConfig();
    return this.getProvider(cfg).isConfigured();
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const cfg = await this.getTenantConfig();
    const primary = this.getProvider(cfg);

    if (primary.isConfigured()) {
      return primary.complete(options);
    }

    const fallback = this.getFallbackProvider(cfg.provider);
    if (fallback?.isConfigured()) {
      return fallback.complete(options);
    }

    throw new Error(
      'Nenhum provider de IA configurado. Defina ANTHROPIC_API_KEY ou OPENAI_API_KEY no .env.',
    );
  }

  private getFallbackProvider(current: string): LlmProvider | null {
    const anthropicKey = this.config.get('ANTHROPIC_API_KEY') || '';
    const openaiKey = this.config.get('OPENAI_API_KEY') || '';

    if (current !== 'anthropic' && anthropicKey) {
      return new AnthropicProvider(anthropicKey);
    }
    if (current !== 'openai' && openaiKey) {
      return new OpenAiProvider(openaiKey);
    }
    return null;
  }
}
