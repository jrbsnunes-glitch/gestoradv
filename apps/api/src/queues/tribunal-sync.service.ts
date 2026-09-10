import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TribunalSyncService implements OnModuleInit {
  constructor(@InjectQueue('tribunal-sync') private queue: Queue) {}

  async onModuleInit() {
    await this.queue.add(
      'sync-movimentacoes',
      {},
      {
        repeat: { pattern: '0 */6 * * *' },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
  }

  async syncNow() {
    return this.queue.add('sync-manual', {}, { removeOnComplete: true });
  }
}
