import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContext } from './tenant.context';
import { TenantPrismaService } from './tenant-prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [TenantContext, TenantPrismaService],
  exports: [TenantContext, TenantPrismaService],
})
export class TenantModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer): void {
    const mode = this.configService.get<string>('DEPLOYMENT_MODE', 'standalone');

    if (mode === 'saas') {
      consumer.apply(TenantMiddleware).forRoutes('*');
    }
  }
}
