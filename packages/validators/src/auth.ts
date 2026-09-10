import { z } from 'zod';

export const loginSchema = z.object({
  tenantSlug: z.string().min(2, 'Informe a abreviatura do escritório'),
  username: z.string().min(2, 'Informe o usuário'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
  role: z.enum(['ADMIN', 'ADVOGADO', 'ESTAGIARIO', 'SECRETARIA', 'CLIENTE']).optional(),
  oabNumber: z.string().optional(),
  oabState: z.string().length(2).optional(),
  phone: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Nova senha deve conter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Nova senha deve conter ao menos um número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
