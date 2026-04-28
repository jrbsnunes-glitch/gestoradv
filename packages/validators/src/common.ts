import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
});

export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF inválido');

export const cnpjSchema = z
  .string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ inválido');

export const phoneSchema = z
  .string()
  .regex(/^\+?55?\d{10,11}$/, 'Telefone inválido');
