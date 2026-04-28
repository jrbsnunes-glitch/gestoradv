import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'advogado@escritorio.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  password: string;
}

enum RoleEnum {
  ADMIN = 'ADMIN',
  ADVOGADO = 'ADVOGADO',
  ESTAGIARIO = 'ESTAGIARIO',
  SECRETARIA = 'SECRETARIA',
  CLIENTE = 'CLIENTE',
}

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'joao@escritorio.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: RoleEnum, default: RoleEnum.CLIENTE })
  @IsOptional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  oabNumber?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  oabState?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;
}
