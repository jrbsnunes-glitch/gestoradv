import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeFaqService } from './knowledge-faq.service';

const DEFAULT_FAQS = [
  {
    categoria: 'horario',
    pergunta: 'Qual o horário de atendimento?',
    resposta: 'Atendemos de segunda a sexta, das 9h às 18h. Plantões de urgência podem ser agendados via WhatsApp.',
  },
  {
    categoria: 'honorarios',
    pergunta: 'Como funcionam os honorários?',
    resposta: 'Os honorários variam conforme a área e complexidade do caso. O advogado responsável apresentará proposta após a triagem inicial.',
  },
  {
    categoria: 'atendimento',
    pergunta: 'Como funciona o primeiro atendimento?',
    resposta: 'Você descreve sua situação, fazemos triagem da área jurídica e um advogado entra em contato para orientar os próximos passos.',
  },
  {
    categoria: 'processo',
    pergunta: 'Como consultar andamento do meu processo?',
    resposta: 'Clientes cadastrados podem consultar pelo WhatsApp (opção 2) informando CPF ou dados de cadastro.',
  },
];

@Injectable()
export class KnowledgeSeedService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeSeedService.name);

  constructor(
    private prisma: PrismaService,
    private faqService: KnowledgeFaqService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensurePgVector();
      const count = await this.prisma.knowledgeFaq.count();
      if (count > 0) return;

      for (const faq of DEFAULT_FAQS) {
        await this.faqService.create(faq);
      }
      this.logger.log(`Seed: ${DEFAULT_FAQS.length} FAQs padrão criadas`);
    } catch (err: any) {
      this.logger.debug(`Knowledge seed skipped: ${err.message}`);
    }
  }

  private async ensurePgVector() {
    await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE knowledge_documents
      ADD COLUMN IF NOT EXISTS search_embedding vector(1536)
    `);
  }
}
