import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PrazosAlertService implements OnModuleInit {
  constructor(@InjectQueue('prazos-alerts') private queue: Queue) {}

  async onModuleInit() {
    const existingJobs = await this.queue.getRepeatableJobs();
    const hasCheck = existingJobs.some((j) => j.name === 'check-prazos');
    if (!hasCheck) {
      await this.queue.add('check-prazos', {}, {
        repeat: { every: 60 * 60 * 1000 },
      });
      console.log('Scheduled prazos check every hour');
    }
  }

  async triggerCheck() {
    await this.queue.add('check-prazos', { manual: true });
  }
}
