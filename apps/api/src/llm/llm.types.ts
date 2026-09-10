export type LlmRole = 'user' | 'assistant' | 'system';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LlmCompletionOptions {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  tools?: LlmToolDefinition[];
}

export interface LlmToolCall {
  id?: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmCompletionResult {
  text: string;
  toolCalls: LlmToolCall[];
  provider: string;
  model: string;
}

export interface LlmProviderConfig {
  provider: 'anthropic' | 'openai' | 'ollama';
  model?: string | null;
  ollamaBaseUrl?: string | null;
}

export interface LlmProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(options: LlmCompletionOptions): Promise<LlmCompletionResult>;
}
