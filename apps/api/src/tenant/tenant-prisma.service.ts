import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@gestor-adv/database';

interface PoolEntry {
  client: PrismaClient;
  lastUsed: Date;
}

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);
  private pool = new Map<string, PoolEntry>();
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupIdle(), 60_000);
  }

  getClient(databaseUrl: string): PrismaClient {
    const existing = this.pool.get(databaseUrl);
    if (existing) {
      existing.lastUsed = new Date();
      return existing.client;
    }

    const client = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    this.pool.set(databaseUrl, { client, lastUsed: new Date() });
    this.logger.log(`New tenant connection created. Pool size: ${this.pool.size}`);

    return client;
  }

  private async cleanupIdle(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [url, entry] of this.pool.entries()) {
      if (now - entry.lastUsed.getTime() > this.IDLE_TIMEOUT_MS) {
        toRemove.push(url);
      }
    }

    for (const url of toRemove) {
      const entry = this.pool.get(url);
      if (entry) {
        await entry.client.$disconnect();
        this.pool.delete(url);
        this.logger.log(`Idle tenant connection closed. Pool size: ${this.pool.size}`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    for (const [, entry] of this.pool.entries()) {
      await entry.client.$disconnect();
    }
    this.pool.clear();
  }
}
