import { Module } from '@nestjs/common';
import { ProcessosService } from './processos.service';
import { ProcessosController } from './processos.controller';

@Module({
  providers: [ProcessosService],
  controllers: [ProcessosController],
  exports: [ProcessosService],
})
export class ProcessosModule {}
