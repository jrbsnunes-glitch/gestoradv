import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AtendimentoSlaService implements OnModuleInit {
  constructor(@InjectQueue('atendimento-sla') private queue: Queue) {}

  async onModuleInit() {
    const existing = await this.queue.getRepeatableJobs();
    const has = existing.some((j) => j.name === 'check-sla');
    if (!has) {
      await this.queue.add(
        'check-sla',
        {},
        { repeat: { every: 5 * 60 * 1000 } },
      );
      console.log('Scheduled atendimento SLA check every 5 minutes');
    }
  }

  async triggerCheck() {
    await this.queue.add('check-sla', { manual: true });
  }
}
