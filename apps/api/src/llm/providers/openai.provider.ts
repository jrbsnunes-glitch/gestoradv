import OpenAI from 'openai';
import {
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
} from '../llm.types';

export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;

  constructor(
    private apiKey: string,
    private defaultModel = 'gpt-4o-mini',
  ) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI API key não configurada');
    }

    const model = this.defaultModel;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    for (const m of options.messages) {
      if (m.role === 'system') continue;
      messages.push({ role: m.role, content: m.content });
    }

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: options.maxTokens ?? 2048,
      messages,
      tools: options.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      })),
    });

    const choice = response.choices[0];
    const toolCalls =
      choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
      })) ?? [];

    return {
      text: choice.message.content ?? '',
      toolCalls,
      provider: this.name,
      model,
    };
  }
}
