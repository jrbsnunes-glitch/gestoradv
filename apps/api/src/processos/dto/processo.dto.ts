import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MinLength } from 'class-validator';

enum AreaDireito {
  TRABALHISTA = 'TRABALHISTA',
  CIVIL = 'CIVIL',
  PENAL = 'PENAL',
  FAMILIA = 'FAMILIA',
  TRIBUTARIO = 'TRIBUTARIO',
  PREVIDENCIARIO = 'PREVIDENCIARIO',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  EMPRESARIAL = 'EMPRESARIAL',
  CONSUMIDOR = 'CONSUMIDOR',
  AMBIENTAL = 'AMBIENTAL',
  OUTRO = 'OUTRO',
}

enum ProcessoStatus {
  ATIVO = 'ATIVO',
  ARQUIVADO = 'ARQUIVADO',
  SUSPENSO = 'SUSPENSO',
  ENCERRADO = 'ENCERRADO',
  EM_RECURSO = 'EM_RECURSO',
}

export class CreateProcessoDto {
  @ApiProperty({ example: '0001234-56.2024.8.16.0001' })
  @IsString()
  @MinLength(5)
  numero: string;

  @ApiProperty({ example: 'TJPR' })
  @IsString()
  tribunal: string;

  @ApiPropertyOptional({ example: '1ª Vara Cível' })
  @IsOptional()
  @IsString()
  vara?: string;

  @ApiPropertyOptional({ example: 'Curitiba' })
  @IsOptional()
  @IsString()
  comarca?: string;

  @ApiProperty({ enum: AreaDireito })
  @IsEnum(AreaDireito)
  area: AreaDireito;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  valorCausa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  dataDistribuicao?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  clienteId: string;

  @ApiPropertyOptional({ description: 'ID do advogado responsável' })
  @IsOptional()
  @IsString()
  advogadoId?: string;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  percentualEscritorio?: number;
}

export class UpdateProcessoDto extends PartialType(CreateProcessoDto) {
  @ApiPropertyOptional({ enum: ProcessoStatus })
  @IsOptional()
  @IsEnum(ProcessoStatus)
  status?: ProcessoStatus;
}

enum ProcessoResultado {
  GANHO = 'GANHO',
  PERDIDO = 'PERDIDO',
  ACORDO = 'ACORDO',
  DESISTENCIA = 'DESISTENCIA',
}

export class ConcluirProcessoDto {
  @ApiProperty({ enum: ProcessoResultado })
  @IsEnum(ProcessoResultado)
  resultado: ProcessoResultado;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @IsNumber()
  valorReceber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  dataPrevistaPagamento?: Date;
}
