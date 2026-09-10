import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrazosAlertProcessor } from './processors/prazos-alert.processor';
import { PrazosAlertService } from './prazos-alert.service';
import { AtendimentoSlaProcessor } from './processors/atendimento-sla.processor';
import { AtendimentoSlaService } from './atendimento-sla.service';
import { TribunalSyncProcessor } from './processors/tribunal-sync.processor';
import { TribunalSyncService } from './tribunal-sync.service';
import { WhatsappModule } from '../integrations/whatsapp/whatsapp.module';
import { TribunaisModule } from '../integrations/tribunais/tribunais.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(config.get('REDIS_URL') || 'redis://localhost:6379').hostname,
          port: parseInt(new URL(config.get('REDIS_URL') || 'redis://localhost:6379').port || '6379'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'prazos-alerts' }),
    BullModule.registerQueue({ name: 'atendimento-sla' }),
    BullModule.registerQueue({ name: 'tribunal-sync' }),
    WhatsappModule,
    TribunaisModule,
  ],
  providers: [
    PrazosAlertProcessor,
    PrazosAlertService,
    AtendimentoSlaProcessor,
    AtendimentoSlaService,
    TribunalSyncProcessor,
    TribunalSyncService,
  ],
  exports: [PrazosAlertService, AtendimentoSlaService, TribunalSyncService],
})
export class QueuesModule {}
