import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { EmbeddingService } from './embedding.service';
import { KnowledgeFaqService } from './knowledge-faq.service';

const RAG_SYSTEM = `Você é assistente de um escritório de advocacia brasileiro.
Responda em português, de forma clara e objetiva.
Use APENAS as informações do contexto fornecido.
Nunca invente números de processo, prazos ou valores.
Se não souber ou o contexto for insuficiente, diga que encaminhará para um advogado humano.
NÃO forneça parecer jurídico definitivo.`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private embedding: EmbeddingService,
    private faqService: KnowledgeFaqService,
  ) {}

  async isEnabled(): Promise<boolean> {
    const esc = await this.prisma.escritorio.findFirst({ select: { aiRagEnabled: true } });
    return esc?.aiRagEnabled ?? true;
  }

  async retrieveDocuments(query: string, limit = 5): Promise<Array<{ titulo: string; conteudo: string }>> {
    const vector = await this.embedding.createEmbedding(query);
    if (vector) {
      try {
        const literal = this.embedding.toVectorLiteral(vector);
        const rows = await this.prisma.$queryRawUnsafe<
          Array<{ titulo: string; conteudo: string }>
        >(
          `SELECT titulo, conteudo FROM knowledge_documents
           WHERE is_active = true AND search_embedding IS NOT NULL
           ORDER BY search_embedding <=> $1::vector
           LIMIT $2`,
          literal,
          limit,
        );
        if (rows.length > 0) return rows;
      } catch (err: any) {
        this.logger.debug(`Busca vetorial indisponível: ${err.message}`);
      }
    }

    const ilike = await this.prisma.knowledgeDocument.findMany({
      where: {
        isActive: true,
        OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { conteudo: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { titulo: true, conteudo: true },
    });
    return ilike;
  }

  buildContext(docs: Array<{ titulo: string; conteudo: string }>, faqBlock: string): string {
    const lines: string[] = [];
    if (faqBlock) lines.push('FAQs DO ESCRITÓRIO:\n' + faqBlock);
    if (docs.length) {
      lines.push('DOCUMENTOS RELEVANTES:');
      for (const d of docs) {
        lines.push(`- ${d.titulo}: ${d.conteudo.slice(0, 800)}`);
      }
    }
    return lines.join('\n');
  }

  async generateReply(query: string, history?: string): Promise<string | null> {
    if (!(await this.isEnabled())) return null;
    if (!(await this.llm.isConfigured())) return null;

    const [docs, faqBlock] = await Promise.all([
      this.retrieveDocuments(query),
      this.faqService.formatForContext(),
    ]);

    const context = this.buildContext(docs, faqBlock);
    if (!context.trim()) return null;

    const esc = await this.prisma.escritorio.findFirst({ select: { aiSystemPrompt: true } });
    const system = esc?.aiSystemPrompt?.trim() || RAG_SYSTEM;

    const userContent = `${history ? `HISTÓRICO:\n${history}\n\n` : ''}CONTEXTO:\n${context}\n\nPERGUNTA DO CLIENTE:\n${query}`;

    const result = await this.llm.complete({
      system,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 1024,
    });

    return result.text.trim() || null;
  }

  async indexDocument(documentId: string): Promise<void> {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id: documentId } });
    if (!doc) return;

    const text = `${doc.titulo}\n${doc.conteudo}`;
    const vector = await this.embedding.createEmbedding(text);
    if (!vector) return;

    const literal = this.embedding.toVectorLiteral(vector);
    await this.prisma.$executeRawUnsafe(
      `UPDATE knowledge_documents SET search_embedding = $1::vector WHERE id = $2`,
      literal,
      documentId,
    );
  }
}
