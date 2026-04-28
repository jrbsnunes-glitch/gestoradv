import { Module } from '@nestjs/common';
import { PrazosService } from './prazos.service';
import { PrazosController } from './prazos.controller';

@Module({
  providers: [PrazosService],
  controllers: [PrazosController],
  exports: [PrazosService],
})
export class PrazosModule {}
