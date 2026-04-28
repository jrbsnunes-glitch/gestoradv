import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceiroService } from './financeiro.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private financeiroService: FinanceiroService) {}

  @Post()
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Criar lançamento financeiro' })
  async create(@CurrentUser('id') userId: string, @Body() body: any): Promise<any> {
    return this.financeiroService.create(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lançamentos' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('clienteId') clienteId?: string,
    @Query('processoId') processoId?: string,
    @Query('mes') mes?: string,
    @Query('advogadoId') advogadoId?: string,
  ): Promise<any> {
    return this.financeiroService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, tipo, clienteId, processoId, mes, advogadoId },
    );
  }

  @Get('caixa')
  @ApiOperation({ summary: 'Caixa do período (entradas, saídas, saldo)' })
  async caixa(
    @Query('de') de: string,
    @Query('ate') ate: string,
    @Query('advogadoId') advogadoId?: string,
  ): Promise<any> {
    return this.financeiroService.getCaixa(de, ate, advogadoId);
  }

  @Get('resumo-mensal')
  @ApiOperation({ summary: 'Resumo financeiro mensal' })
  async resumoMensal(
    @Query('mes') mes?: string,
    @Query('advogadoId') advogadoId?: string,
  ): Promise<any> {
    return this.financeiroService.getResumoMensal(mes, advogadoId);
  }

  @Get('resumo-anual')
  @ApiOperation({ summary: 'Resumo financeiro anual' })
  async resumoAnual(
    @Query('ano') ano?: string,
    @Query('advogadoId') advogadoId?: string,
  ): Promise<any> {
    return this.financeiroService.getResumoAnual(ano ? parseInt(ano) : undefined, advogadoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lançamento por ID' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.financeiroService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Atualizar lançamento' })
  async update(@Param('id') id: string, @Body() body: any): Promise<any> {
    return this.financeiroService.update(id, body);
  }

  @Patch(':id/pago')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Marcar como pago' })
  async marcarPago(@Param('id') id: string, @Body() body: { formaPagamento?: string }): Promise<any> {
    return this.financeiroService.marcarPago(id, body.formaPagamento);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancelar lançamento' })
  async cancelar(@Param('id') id: string): Promise<any> {
    return this.financeiroService.cancelar(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover lançamento' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.financeiroService.remove(id);
  }
}
