import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class KnowledgeFaqService {
  constructor(
    private prisma: PrismaService,
    private embedding: EmbeddingService,
  ) {}

  async findAll(activeOnly = true) {
    return this.prisma.knowledgeFaq.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ categoria: 'asc' }, { pergunta: 'asc' }],
    });
  }

  async create(data: { pergunta: string; resposta: string; categoria?: string }) {
    const faq = await this.prisma.knowledgeFaq.create({
      data: {
        pergunta: data.pergunta,
        resposta: data.resposta,
        categoria: data.categoria || 'geral',
      },
    });
    await this.syncDocument(faq.id, faq.pergunta, faq.resposta, faq.categoria);
    return faq;
  }

  async update(id: string, data: Partial<{ pergunta: string; resposta: string; categoria: string; isActive: boolean }>) {
    const faq = await this.prisma.knowledgeFaq.update({ where: { id }, data });
    await this.syncDocument(faq.id, faq.pergunta, faq.resposta, faq.categoria, faq.isActive);
    return faq;
  }

  async remove(id: string) {
    const faq = await this.prisma.knowledgeFaq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ não encontrada');
    await this.prisma.knowledgeDocument.deleteMany({ where: { faqId: id } });
    return this.prisma.knowledgeFaq.delete({ where: { id } });
  }

  async formatForContext(): Promise<string> {
    const faqs = await this.findAll(true);
    if (!faqs.length) return '';
    return faqs.map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`).join('\n\n');
  }

  private async syncDocument(faqId: string, pergunta: string, resposta: string, categoria: string, isActive = true) {
    const titulo = `[FAQ/${categoria}] ${pergunta}`;
    const conteudo = `${pergunta}\n\n${resposta}`;

    const existing = await this.prisma.knowledgeDocument.findUnique({ where: { faqId } });
    const doc = existing
      ? await this.prisma.knowledgeDocument.update({
          where: { id: existing.id },
          data: { titulo, conteudo, isActive, tipo: 'FAQ' },
        })
      : await this.prisma.knowledgeDocument.create({
          data: { titulo, conteudo, faqId, tipo: 'FAQ', isActive },
        });

    if (isActive && this.embedding.isConfigured) {
      const vector = await this.embedding.createEmbedding(conteudo);
      if (vector) {
        const literal = this.embedding.toVectorLiteral(vector);
        await this.prisma.$executeRawUnsafe(
          `UPDATE knowledge_documents SET search_embedding = $1::vector WHERE id = $2`,
          literal,
          doc.id,
        );
      }
    }
  }

  async createDocument(data: { titulo: string; conteudo: string; tipo?: 'FAQ' | 'JURISPRUDENCIA' | 'MODELO_INTERNO' }) {
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'MODELO_INTERNO',
      },
    });
    if (this.embedding.isConfigured) {
      const vector = await this.embedding.createEmbedding(`${doc.titulo}\n${doc.conteudo}`);
      if (vector) {
        const literal = this.embedding.toVectorLiteral(vector);
        await this.prisma.$executeRawUnsafe(
          `UPDATE knowledge_documents SET search_embedding = $1::vector WHERE id = $2`,
          literal,
          doc.id,
        );
      }
    }
    return doc;
  }

  async listDocuments() {
    return this.prisma.knowledgeDocument.findMany({
      where: { faqId: null },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
