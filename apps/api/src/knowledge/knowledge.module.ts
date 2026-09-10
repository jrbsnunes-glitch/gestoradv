import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeFaqService } from './knowledge-faq.service';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';
import { KnowledgeSeedService } from './knowledge-seed.service';

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeFaqService, EmbeddingService, RagService, KnowledgeSeedService],
  exports: [KnowledgeFaqService, EmbeddingService, RagService],
})
export class KnowledgeModule {}
