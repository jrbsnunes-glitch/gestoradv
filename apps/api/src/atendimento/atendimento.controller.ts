import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AtendimentoService } from './atendimento.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Atendimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('atendimentos')
export class AtendimentoController {
  constructor(private atendimentoService: AtendimentoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atendimentos' })
  async findAll(
    @Query('status') status?: string,
    @Query('canal') canal?: string,
    @Query('responsavelId') responsavelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.atendimentoService.findAll({
      status,
      canal,
      responsavelId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de atendimentos' })
  async stats(): Promise<any> {
    return this.atendimentoService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do atendimento' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.atendimentoService.findById(id);
  }

  @Post(':id/responder')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Responder atendimento' })
  async responder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { conteudo: string },
  ): Promise<any> {
    return this.atendimentoService.responder(id, userId, body.conteudo);
  }

  @Post(':id/sugerir-resposta')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Pedir sugestão de resposta da IA' })
  async sugerirResposta(@Param('id') id: string): Promise<any> {
    return this.atendimentoService.sugerirResposta(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Alterar status' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }): Promise<any> {
    return this.atendimentoService.updateStatus(id, body.status);
  }

  @Patch(':id/atribuir')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Atribuir a um advogado' })
  async atribuir(@Param('id') id: string, @Body() body: { responsavelId: string }): Promise<any> {
    return this.atendimentoService.atribuir(id, body.responsavelId);
  }

  @Patch(':id/vincular-cliente')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Vincular a um cliente existente' })
  async vincularCliente(@Param('id') id: string, @Body() body: { clienteId: string }): Promise<any> {
    return this.atendimentoService.vincularCliente(id, body.clienteId);
  }

  @Post(':id/aprovar-cadastro')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Aprovar pré-cadastro de cliente via WhatsApp' })
  async aprovarCadastro(@Param('id') id: string): Promise<any> {
    return this.atendimentoService.aprovarCadastro(id);
  }
}
