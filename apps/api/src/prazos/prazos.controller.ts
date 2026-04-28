import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrazosService } from './prazos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePrazoDto } from './dto/prazo.dto';

@ApiTags('Prazos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prazos')
export class PrazosController {
  constructor(private prazosService: PrazosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo prazo' })
  async create(@Body() dto: CreatePrazoDto): Promise<any> {
    return this.prazosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar prazos' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('urgencia') urgencia?: string,
  ): Promise<any> {
    return this.prazosService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, urgencia },
    );
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Prazos dos próximos dias' })
  async upcoming(@Query('days') days?: string): Promise<any> {
    return this.prazosService.findUpcoming(days ? parseInt(days) : 7);
  }

  @Get('processo/:processoId')
  @ApiOperation({ summary: 'Prazos pendentes de um processo' })
  async findByProcesso(@Param('processoId') processoId: string): Promise<any> {
    return this.prazosService.findByProcesso(processoId);
  }

  @Patch(':id/done')
  @ApiOperation({ summary: 'Marcar prazo como cumprido' })
  async markAsDone(@Param('id') id: string): Promise<any> {
    return this.prazosService.markAsDone(id);
  }
}
