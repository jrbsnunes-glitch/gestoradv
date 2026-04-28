import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Maria Santos' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  birthDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '01234-567' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'google_ads' })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  consentLgpd?: boolean;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}
