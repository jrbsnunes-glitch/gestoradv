import { z } from 'zod';

const areasDireito = [
  'TRABALHISTA', 'CIVIL', 'PENAL', 'FAMILIA', 'TRIBUTARIO',
  'PREVIDENCIARIO', 'ADMINISTRATIVO', 'EMPRESARIAL', 'CONSUMIDOR',
  'AMBIENTAL', 'OUTRO',
] as const;

const processoStatuses = ['ATIVO', 'ARQUIVADO', 'SUSPENSO', 'ENCERRADO', 'EM_RECURSO'] as const;

export const createProcessoSchema = z.object({
  numero: z.string().min(5, 'Número do processo é obrigatório'),
  tribunal: z.string().min(2, 'Tribunal é obrigatório'),
  vara: z.string().optional(),
  comarca: z.string().optional(),
  area: z.enum(areasDireito),
  valorCausa: z.number().positive().optional(),
  dataDistribuicao: z.coerce.date().optional(),
  descricao: z.string().optional(),
  clienteId: z.string().cuid('ID do cliente inválido'),
  advogadoId: z.string().cuid('ID do advogado inválido').optional(),
  percentualEscritorio: z.number().int().min(0).max(100).optional(),
});

export type CreateProcessoInput = z.infer<typeof createProcessoSchema>;

export const updateProcessoSchema = createProcessoSchema.partial().extend({
  status: z.enum(processoStatuses).optional(),
});

export type UpdateProcessoInput = z.infer<typeof updateProcessoSchema>;

export const createPrazoSchema = z.object({
  processoId: z.string().cuid(),
  descricao: z.string().min(3, 'Descrição é obrigatória'),
  dataLimite: z.coerce.date(),
  urgencia: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  observacoes: z.string().optional(),
});

export type CreatePrazoInput = z.infer<typeof createPrazoSchema>;

const processoResultados = ['GANHO', 'PERDIDO', 'ACORDO', 'DESISTENCIA'] as const;

export const concluirProcessoSchema = z.object({
  resultado: z.enum(processoResultados),
  valorReceber: z.number().positive().optional(),
  dataPrevistaPagamento: z.coerce.date().optional(),
});

export type ConcluirProcessoInput = z.infer<typeof concluirProcessoSchema>;
