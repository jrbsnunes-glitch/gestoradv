import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI | null = null;
  private model: string;

  constructor(private config: ConfigService) {
    const key = this.config.get('OPENAI_API_KEY');
    if (key) {
      this.openai = new OpenAI({ apiKey: key });
    }
    this.model = this.config.get('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
  }

  get isConfigured(): boolean {
    return !!this.openai;
  }

  async createEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai || !text.trim()) return null;
    try {
      const res = await this.openai.embeddings.create({
        model: this.model,
        input: text.slice(0, 8000),
      });
      return res.data[0]?.embedding ?? null;
    } catch (err: any) {
      this.logger.warn(`Embedding falhou: ${err.message}`);
      return null;
    }
  }

  toVectorLiteral(vector: number[]): string {
    return `[${vector.map((v) => v.toFixed(8)).join(',')}]`;
  }
}
