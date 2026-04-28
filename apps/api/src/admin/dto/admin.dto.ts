import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, IsBoolean, MinLength, Matches } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@gestoradv.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'abc-advocacia' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug deve conter apenas letras minúsculas, números e hífens' })
  slug: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsString()
  cnpj: string;

  @ApiProperty({ example: 'ABC Advocacia Ltda' })
  @IsString()
  razaoSocial: string;

  @ApiPropertyOptional({ example: 'ABC Advocacia' })
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiProperty({ example: 'contato@abcadvocacia.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({ example: 'Administrador' })
  @IsString()
  adminName: string;

  @ApiProperty({ example: 'admin@abcadvocacia.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  adminPassword: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;
}

export class CreatePlanDto {
  @ApiProperty({ example: 'premium' })
  @IsString()
  nome: string;

  @ApiPropertyOptional({ example: 'Plano premium com todos os recursos' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  maxUsuarios: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  maxProcessos: number;

  @ApiProperty({ example: 5120 })
  @IsNumber()
  maxArmazenamento: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  whatsappAtivo: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  iaAtiva: boolean;

  @ApiProperty({ example: 249.90 })
  @IsNumber()
  precoMensal: number;

  @ApiPropertyOptional({ example: 2500, description: 'Setup único de configuração (R$)' })
  @IsOptional()
  @IsNumber()
  precoSetup?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxUsuarios?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxProcessos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxArmazenamento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappAtivo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  iaAtiva?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  precoMensal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  precoSetup?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class RenewLicenseDto {
  @ApiPropertyOptional({ example: 30, description: 'Dias a adicionar' })
  @IsOptional()
  @IsNumber()
  dias?: number;
}
