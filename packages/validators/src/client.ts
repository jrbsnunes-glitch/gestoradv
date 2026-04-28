import { z } from 'zod';
import { cpfSchema, cnpjSchema, phoneSchema } from './common';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: phoneSchema.optional(),
  cpfCnpj: z.union([cpfSchema, cnpjSchema]).optional(),
  birthDate: z.coerce.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  notes: z.string().optional(),
  leadSource: z.string().optional(),
  consentLgpd: z.boolean().default(false),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
