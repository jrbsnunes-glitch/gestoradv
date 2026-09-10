import Anthropic from '@anthropic-ai/sdk';
import {
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
} from '../llm.types';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;

  constructor(
    private apiKey: string,
    private defaultModel = 'claude-sonnet-4-20250514',
  ) {
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new Error('Anthropic API key não configurada');
    }

    const model = this.defaultModel;
    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: options.system,
      messages: options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      tools: options.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      })),
    });

    const textBlocks = response.content.filter((b) => b.type === 'text');
    const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

    return {
      text: textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('\n'),
      toolCalls: toolBlocks.map((b) =>
        b.type === 'tool_use'
          ? { id: b.id, name: b.name, input: b.input as Record<string, unknown> }
          : { name: '', input: {} },
      ),
      provider: this.name,
      model,
    };
  }
}
