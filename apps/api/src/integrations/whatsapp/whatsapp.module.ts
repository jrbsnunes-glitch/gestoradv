import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappBotService } from './whatsapp-bot.service';
import { WhatsappAlertService } from './whatsapp-alert.service';
import { WhatsappController } from './whatsapp.controller';
import { AtendimentoModule } from '../../atendimento/atendimento.module';
import { ChatbotModule } from '../../chatbot/chatbot.module';
import { EmailModule } from '../../email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [AtendimentoModule, ChatbotModule, EmailModule, NotificationsModule],
  providers: [WhatsappService, WhatsappBotService, WhatsappAlertService],
  controllers: [WhatsappController],
  exports: [WhatsappService, WhatsappBotService, WhatsappAlertService],
})
export class WhatsappModule {}
