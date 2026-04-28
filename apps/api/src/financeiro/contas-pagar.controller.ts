import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContasPagarService } from './contas-pagar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contas-pagar')
export class ContasPagarController {
  constructor(private contasPagarService: ContasPagarService) {}

  @Post()
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Criar conta a pagar' })
  async create(@CurrentUser('id') userId: string, @Body() body: any): Promise<any> {
    return this.contasPagarService.create(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas a pagar' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('categoria') categoria?: string,
    @Query('contaFixa') contaFixa?: string,
    @Query('mes') mes?: string,
  ): Promise<any> {
    return this.contasPagarService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, categoria, contaFixa, mes },
    );
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo das contas a pagar do mês' })
  async resumo(@Query('mes') mes?: string): Promise<any> {
    return this.contasPagarService.getResumo(mes);
  }

  @Post('gerar-recorrentes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Gerar contas recorrentes do mês atual' })
  async gerarRecorrentes(@CurrentUser('id') userId: string): Promise<any> {
    return this.contasPagarService.gerarRecorrentes(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta por ID' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.contasPagarService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Atualizar conta' })
  async update(@Param('id') id: string, @Body() body: any): Promise<any> {
    return this.contasPagarService.update(id, body);
  }

  @Patch(':id/pago')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Marcar como pago' })
  async marcarPago(@Param('id') id: string, @Body() body: { formaPagamento?: string }): Promise<any> {
    return this.contasPagarService.marcarPago(id, body.formaPagamento);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancelar conta' })
  async cancelar(@Param('id') id: string): Promise<any> {
    return this.contasPagarService.cancelar(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover conta' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.contasPagarService.remove(id);
  }
}
