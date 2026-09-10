import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { MasterPrismaModule } from './prisma/master-prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProcessosModule } from './processos/processos.module';
import { ClientsModule } from './clients/clients.module';
import { PrazosModule } from './prazos/prazos.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueuesModule } from './queues/queues.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { EscritorioModule } from './escritorio/escritorio.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { AtendimentoModule } from './atendimento/atendimento.module';
import { WhatsappModule } from './integrations/whatsapp/whatsapp.module';
import { CalendarModule } from './integrations/calendar/calendar.module';
import { TribunaisModule } from './integrations/tribunais/tribunais.module';
import { AdminModule } from './admin/admin.module';
import { LicenseGuard } from './escritorio/license.guard';
import { HealthController } from './health.controller';
import { LlmModule } from './llm/llm.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AiAgentModule } from './ai-agent/ai-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LlmModule,
    KnowledgeModule,
    AiAgentModule,
    MasterPrismaModule,
    PrismaModule,
    TenantModule,
    AuthModule,
    UsersModule,
    ProcessosModule,
    ClientsModule,
    PrazosModule,
    TarefasModule,
    NotificationsModule,
    QueuesModule,
    EmailModule,
    UploadModule,
    ChatbotModule,
    AtendimentoModule,
    EscritorioModule,
    FinanceiroModule,
    RelatoriosModule,
    WhatsappModule,
    CalendarModule,
    TribunaisModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
  ],
})
export class AppModule {}
