import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TarefasService } from './tarefas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTarefaDto, UpdateTarefaDto, UpdateTarefaStatusDto } from './dto/tarefa.dto';

@ApiTags('Tarefas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tarefas')
export class TarefasController {
  constructor(private tarefasService: TarefasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova tarefa' })
  async create(@Body() dto: CreateTarefaDto, @CurrentUser('id') userId: string): Promise<any> {
    return this.tarefasService.create({ ...dto, responsavelId: dto.responsavelId || userId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar tarefas' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('responsavelId') responsavelId?: string,
  ): Promise<any> {
    return this.tarefasService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      { status, responsavelId },
    );
  }

  @Get('mine')
  @ApiOperation({ summary: 'Minhas tarefas' })
  async findMine(@CurrentUser('id') userId: string): Promise<any> {
    return this.tarefasService.findAll(1, 50, { responsavelId: userId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  async update(@Param('id') id: string, @Body() dto: UpdateTarefaDto): Promise<any> {
    return this.tarefasService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da tarefa' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTarefaStatusDto): Promise<any> {
    return this.tarefasService.updateStatus(id, dto.status);
  }
}
