import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, MinLength } from 'class-validator';

enum PrazoUrgencia {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export class CreatePrazoDto {
  @ApiProperty({ description: 'ID do processo' })
  @IsString()
  processoId: string;

  @ApiProperty({ example: 'Prazo para contestação' })
  @IsString()
  @MinLength(3)
  descricao: string;

  @ApiProperty({ example: '2024-12-31T23:59:59.000Z' })
  @IsDateString()
  dataLimite: Date;

  @ApiPropertyOptional({ enum: PrazoUrgencia, default: PrazoUrgencia.MEDIA })
  @IsOptional()
  @IsEnum(PrazoUrgencia)
  urgencia?: PrazoUrgencia;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}
