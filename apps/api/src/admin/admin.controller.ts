import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import {
  AdminLoginDto,
  CreateTenantDto,
  UpdateTenantDto,
  CreatePlanDto,
  UpdatePlanDto,
  RenewLicenseDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== AUTH ====================

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login do admin fornecedor' })
  async login(@Body() dto: AdminLoginDto): Promise<any> {
    return this.adminService.login(dto.email, dto.password);
  }

  // ==================== TENANTS ====================

  @Get('tenants')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar escritórios' })
  async listTenants(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.adminService.listTenants({
      search,
      isActive,
      planId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('tenants')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo escritório (provisioning)' })
  async createTenant(@Body() dto: CreateTenantDto): Promise<any> {
    return this.adminService.createTenant(dto);
  }

  @Get('tenants/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe do escritório' })
  async getTenant(@Param('id') id: string): Promise<any> {
    return this.adminService.getTenant(id);
  }

  @Patch('tenants/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar escritório' })
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto): Promise<any> {
    return this.adminService.updateTenant(id, dto);
  }

  @Post('tenants/:id/activate')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Ativar escritório' })
  async activateTenant(@Param('id') id: string): Promise<any> {
    return this.adminService.activateTenant(id);
  }

  @Post('tenants/:id/deactivate')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Desativar escritório' })
  async deactivateTenant(@Param('id') id: string): Promise<any> {
    return this.adminService.deactivateTenant(id);
  }

  // ==================== LICENSES ====================

  @Get('tenants/:id/license')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da licença' })
  async getTenantLicense(@Param('id') id: string): Promise<any> {
    return this.adminService.getTenantLicense(id);
  }

  @Post('tenants/:id/license/generate')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Gerar nova chave de licença' })
  async generateLicense(@Param('id') id: string): Promise<any> {
    return this.adminService.generateLicense(id);
  }

  @Post('tenants/:id/license/revoke')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Revogar licença' })
  async revokeLicense(@Param('id') id: string): Promise<any> {
    return this.adminService.revokeLicense(id);
  }

  @Post('tenants/:id/license/renew')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar licença' })
  async renewLicense(@Param('id') id: string, @Body() dto: RenewLicenseDto): Promise<any> {
    return this.adminService.renewLicense(id, dto.dias);
  }

  // ==================== PLANS ====================

  @Get('plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar planos' })
  async listPlans(): Promise<any> {
    return this.adminService.listPlans();
  }

  @Post('plans')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar plano' })
  async createPlan(@Body() dto: CreatePlanDto): Promise<any> {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar plano' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto): Promise<any> {
    return this.adminService.updatePlan(id, dto);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Métricas globais do painel admin' })
  async getDashboard(): Promise<any> {
    return this.adminService.getDashboard();
  }
}
