import {
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
} from '../llm.types';

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';

  constructor(
    private baseUrl: string,
    private defaultModel = 'llama3.2',
  ) {}

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const model = this.defaultModel;
    const messages = [...options.messages];
    if (options.system) {
      messages.unshift({ role: 'system', content: options.system });
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: { num_predict: options.maxTokens ?? 2048 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return {
      text: data.message?.content ?? '',
      toolCalls: [],
      provider: this.name,
      model,
    };
  }
}
