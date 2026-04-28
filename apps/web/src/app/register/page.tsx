'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@gestor-adv/validators';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register: reg,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'ADVOGADO' },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ access_token: string; user: any }>('/auth/register', data);
      login(result.access_token, result.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="GestorAdv" className="h-12 w-12 rounded-lg object-contain" />
            <span className="text-2xl font-bold text-foreground">GestorAdv</span>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
            Criar Conta
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Nome completo</label>
              <input
                id="name"
                {...reg('name')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="João da Silva"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                {...reg('email')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="joao@escritorio.com"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Senha</label>
              <input
                id="password"
                type="password"
                {...reg('password')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="oabNumber" className="mb-1.5 block text-sm font-medium">OAB (opcional)</label>
                <input
                  id="oabNumber"
                  {...reg('oabNumber')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                  placeholder="12345"
                />
              </div>
              <div>
                <label htmlFor="oabState" className="mb-1.5 block text-sm font-medium">UF OAB</label>
                <input
                  id="oabState"
                  {...reg('oabState')}
                  maxLength={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                  placeholder="SP"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Telefone (opcional)</label>
              <input
                id="phone"
                {...reg('phone')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="+5511999999999"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
