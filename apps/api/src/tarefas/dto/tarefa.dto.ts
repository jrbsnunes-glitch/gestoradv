import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, MinLength } from 'class-validator';

enum TarefaPrioridade {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

enum TarefaStatus {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

export class CreateTarefaDto {
  @ApiProperty({ example: 'Elaborar contestação' })
  @IsString()
  @MinLength(3)
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavelId?: string;

  @ApiPropertyOptional({ enum: TarefaPrioridade, default: TarefaPrioridade.MEDIA })
  @IsOptional()
  @IsEnum(TarefaPrioridade)
  prioridade?: TarefaPrioridade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataLimite?: Date;
}

export class UpdateTarefaDto extends PartialType(CreateTarefaDto) {}

export class UpdateTarefaStatusDto {
  @ApiProperty({ enum: TarefaStatus })
  @IsEnum(TarefaStatus)
  status: TarefaStatus;
}
