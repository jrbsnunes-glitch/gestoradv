import { Module } from '@nestjs/common';
import { AtendimentoService } from './atendimento.service';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoPublicoController } from './atendimento-publico.controller';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [ChatbotModule],
  controllers: [AtendimentoController, AtendimentoPublicoController],
  providers: [AtendimentoService],
  exports: [AtendimentoService],
})
export class AtendimentoModule {}
