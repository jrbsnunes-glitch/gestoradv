import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo cliente' })
  create(@Body() dto: CreateClientDto): Promise<any> {
    return this.clientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.clientsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'ADVOGADO')
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir cliente (somente admin)' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.clientsService.remove(id);
  }

  @Get(':id/processos')
  @ApiOperation({ summary: 'Processos de um cliente' })
  async processos(@Param('id') id: string): Promise<any> {
    return this.clientsService.findProcessos(id);
  }
}
