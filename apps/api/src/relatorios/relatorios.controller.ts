import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RelatoriosService } from './relatorios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private relatoriosService: RelatoriosService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard completo com métricas' })
  async dashboard(@CurrentUser('id') userId: string, @CurrentUser('role') role: string): Promise<any> {
    const advogadoId = role === 'ADMIN' ? undefined : userId;
    return this.relatoriosService.dashboardCompleto(advogadoId);
  }

  @Get('processos')
  @ApiOperation({ summary: 'Relatório de processos' })
  async processos(
    @Query('status') status?: string,
    @Query('area') area?: string,
    @Query('advogadoId') advogadoId?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ): Promise<any> {
    return this.relatoriosService.processos({ status, area, advogadoId, de, ate });
  }

  @Get('prazos')
  @ApiOperation({ summary: 'Relatório de prazos' })
  async prazos(
    @Query('status') status?: string,
    @Query('urgencia') urgencia?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ): Promise<any> {
    return this.relatoriosService.prazos({ status, urgencia, de, ate });
  }

  @Get('produtividade')
  @ApiOperation({ summary: 'Relatório de produtividade por advogado' })
  async produtividade(
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ): Promise<any> {
    return this.relatoriosService.produtividade({ de, ate });
  }

  @Get('agenda')
  @ApiOperation({ summary: 'Eventos da agenda (prazos + tarefas)' })
  async agenda(
    @Query('de') de: string,
    @Query('ate') ate: string,
  ): Promise<any> {
    return this.relatoriosService.agenda(de, ate);
  }
}
