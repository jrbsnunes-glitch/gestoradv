import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
