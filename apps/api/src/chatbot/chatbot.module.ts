import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [EscritorioModule, KnowledgeModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
