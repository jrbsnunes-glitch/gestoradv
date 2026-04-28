import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProcessosService } from './processos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProcessoDto, UpdateProcessoDto, ConcluirProcessoDto } from './dto/processo.dto';

@ApiTags('Processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('processos')
export class ProcessosController {
  constructor(private processosService: ProcessosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo processo' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateProcessoDto,
  ): Promise<any> {
    const advogadoId = (dto as any).advogadoId && userRole === 'ADMIN'
      ? (dto as any).advogadoId
      : userId;
    return this.processosService.create(advogadoId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar processos' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('area') area?: string,
    @Query('advogadoId') advogadoId?: string,
  ): Promise<any> {
    return this.processosService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, area, advogadoId },
    );
  }

  @Post(':id/concluir')
  @ApiOperation({ summary: 'Concluir processo' })
  async concluir(
    @Param('id') id: string,
    @Body() dto: ConcluirProcessoDto,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    return this.processosService.concluir(id, dto as any, userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Estatísticas do dashboard' })
  async dashboard(@CurrentUser('id') userId: string): Promise<any> {
    return this.processosService.getDashboardStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar processo por ID' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.processosService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar processo' })
  async update(@Param('id') id: string, @Body() dto: UpdateProcessoDto): Promise<any> {
    return this.processosService.update(id, dto);
  }
}
