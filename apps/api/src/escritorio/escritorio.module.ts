import { Global, Module } from '@nestjs/common';
import { EscritorioService } from './escritorio.service';
import { EscritorioController } from './escritorio.controller';
import { LicenseGuard } from './license.guard';

@Global()
@Module({
  providers: [EscritorioService, LicenseGuard],
  controllers: [EscritorioController],
  exports: [EscritorioService, LicenseGuard],
})
export class EscritorioModule {}
