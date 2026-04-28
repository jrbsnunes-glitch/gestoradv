import Anthropic from '@anthropic-ai/sdk';
import { TRIAGEM_SYSTEM_PROMPT } from './prompts';

export interface TriagemMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TriagemResult {
  area: string;
  urgencia: number;
  complexidade: 'baixa' | 'media' | 'alta';
  viabilidade: number;
  razao: string;
  proximosPassos: string[];
}

export class TriagemService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: TriagemMessage[]): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: TRIAGEM_SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  extractResult(text: string): TriagemResult | null {
    const jsonMatch = text.match(/\{[\s\S]*?"area"[\s\S]*?\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}
