import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EscritorioService } from './escritorio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Escritório')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escritorio')
export class EscritorioController {
  constructor(private escritorioService: EscritorioService) {}

  @Get()
  @ApiOperation({ summary: 'Obter dados do escritório' })
  async get(): Promise<any> {
    return this.escritorioService.get();
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar ou atualizar dados do escritório' })
  async upsert(@Body() body: any): Promise<any> {
    return this.escritorioService.upsert(body);
  }

  @Get('license')
  @ApiOperation({ summary: 'Status completo da licença' })
  async licenseStatus(): Promise<any> {
    return this.escritorioService.getLicenseStatus();
  }

  @Post('license/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ativar/renovar licença com chave' })
  async activateLicense(@Body() body: { cnpj: string; chave: string }): Promise<any> {
    return this.escritorioService.activateLicense(body.cnpj, body.chave);
  }

  @Post('license/revalidate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Forçar revalidação da licença' })
  async revalidate(): Promise<any> {
    return this.escritorioService.checkAndRevalidate();
  }

  @Get('document-data')
  @ApiOperation({ summary: 'Dados para geração de documentos' })
  async documentData(): Promise<any> {
    return this.escritorioService.getForDocument();
  }

  // ==================== INTEGRAÇÕES ====================

  @Get('integracoes')
  @ApiOperation({ summary: 'Status das integrações (credenciais mascaradas)' })
  async getIntegracoes(): Promise<any> {
    return this.escritorioService.getIntegracoes();
  }

  @Put('integracoes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Salvar credenciais de integrações' })
  async updateIntegracoes(@Body() body: any): Promise<any> {
    return this.escritorioService.updateIntegracoes(body);
  }

  @Post('integracoes/testar-whatsapp')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Testar conexão com WhatsApp Business API' })
  async testarWhatsapp(): Promise<any> {
    return this.escritorioService.testarWhatsapp();
  }
}
