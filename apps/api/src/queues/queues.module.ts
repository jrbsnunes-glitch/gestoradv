import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrazosAlertProcessor } from './processors/prazos-alert.processor';
import { PrazosAlertService } from './prazos-alert.service';
import { WhatsappModule } from '../integrations/whatsapp/whatsapp.module';

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
    WhatsappModule,
  ],
  providers: [PrazosAlertProcessor, PrazosAlertService],
  exports: [PrazosAlertService],
})
export class QueuesModule {}
