import { Module } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { FinanceiroController } from './financeiro.controller';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarController } from './contas-pagar.controller';

@Module({
  providers: [FinanceiroService, ContasPagarService],
  controllers: [FinanceiroController, ContasPagarController],
  exports: [FinanceiroService, ContasPagarService],
})
export class FinanceiroModule {}
