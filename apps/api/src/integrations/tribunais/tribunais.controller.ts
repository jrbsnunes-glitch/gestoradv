import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TribunaisService } from './tribunais.service';

@ApiTags('Tribunais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tribunais')
export class TribunaisController {
  constructor(private tribunaisService: TribunaisService) {}

  @Get(':processoNumero/prazos')
  @ApiOperation({ summary: 'Buscar prazos de um processo nos tribunais' })
  async buscarPrazos(
    @Param('processoNumero') processoNumero: string,
    @Query('tribunal') tribunal?: string,
  ): Promise<any> {
    return this.tribunaisService.buscarPrazos(processoNumero, tribunal);
  }

  @Get(':processoNumero/movimentacoes')
  @ApiOperation({ summary: 'Buscar movimentações de um processo nos tribunais' })
  async buscarMovimentacoes(
    @Param('processoNumero') processoNumero: string,
    @Query('tribunal') tribunal?: string,
  ): Promise<any> {
    return this.tribunaisService.buscarMovimentacoes(processoNumero, tribunal);
  }

  @Get('connectors')
  @ApiOperation({ summary: 'Listar connectors disponíveis' })
  async listConnectors(): Promise<any> {
    return { connectors: this.tribunaisService.getConnectorsDisponiveis() };
  }
}
