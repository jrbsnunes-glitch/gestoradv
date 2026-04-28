import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('advogados')
  @ApiOperation({ summary: 'Listar advogados do escritório' })
  async findAdvogados(): Promise<any> {
    return this.usersService.findAdvogados();
  }

  @Post('advogados')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar advogado' })
  async createAdvogado(@Body() body: {
    name: string;
    email: string;
    phone?: string;
    oabNumber?: string;
    oabState?: string;
    especialidades?: string[];
    percentualEscritorio?: number;
  }): Promise<any> {
    return this.usersService.createAdvogado(body);
  }

  @Patch('advogados/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar advogado' })
  async updateAdvogado(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      phone?: string;
      oabNumber?: string;
      oabState?: string;
      especialidades?: string[];
      percentualEscritorio?: number;
      isActive?: boolean;
    },
  ): Promise<any> {
    return this.usersService.updateAdvogado(id, body);
  }

  @Get('me/preferencias-alerta')
  @ApiOperation({ summary: 'Obter preferências de alerta do usuário logado' })
  async getPreferenciasAlerta(@CurrentUser('id') userId: string): Promise<any> {
    return this.usersService.getPreferenciasAlerta(userId);
  }

  @Patch('me/preferencias-alerta')
  @ApiOperation({ summary: 'Atualizar preferências de alerta do usuário logado' })
  async updatePreferenciasAlerta(
    @CurrentUser('id') userId: string,
    @Body() prefs: { inapp?: boolean; email?: boolean; whatsapp?: boolean },
  ): Promise<any> {
    return this.usersService.updatePreferenciasAlerta(userId, prefs);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
