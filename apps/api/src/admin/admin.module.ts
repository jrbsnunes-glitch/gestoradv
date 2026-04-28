import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
  exports: [AdminService],
})
export class AdminModule {}
