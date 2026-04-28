'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';

interface DashboardData {
  tenants: { total: number; ativos: number; inativos: number; trial: number; criadosMes: number };
  licencas: { expirandoEm7dias: number; expirandoEm15dias: number; expirandoEm30dias: number; expiradas: number };
  financeiro: { receitaMensalEstimada: number };
  planos: Array<{ id: string; nome: string; precoMensal: number; precoSetup: number; ativo: boolean }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) {
      router.push('/admin/login');
    } else {
      setReady(true);
    }
  }, [router]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.get('/admin/dashboard'),
    enabled: ready,
    refetchInterval: 30000,
  });

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: 'Total Escritórios', value: data.tenants.total, color: 'bg-blue-600' },
    { label: 'Ativos', value: data.tenants.ativos, color: 'bg-green-600' },
    { label: 'Inativos', value: data.tenants.inativos, color: 'bg-red-600' },
    { label: 'Em Trial', value: data.tenants.trial, color: 'bg-yellow-600' },
    { label: 'Criados este Mês', value: data.tenants.criadosMes, color: 'bg-purple-600' },
    {
      label: 'Receita Mensal',
      value: `R$ ${data.financeiro.receitaMensalEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      color: 'bg-emerald-600',
    },
  ];

  const alertas = [
    { label: 'Expirando em 7 dias', value: data.licencas.expirandoEm7dias, level: 'text-red-400' },
    { label: 'Expirando em 15 dias', value: data.licencas.expirandoEm15dias, level: 'text-yellow-400' },
    { label: 'Expirando em 30 dias', value: data.licencas.expirandoEm30dias, level: 'text-blue-400' },
    { label: 'Expiradas', value: data.licencas.expiradas, level: 'text-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <div className={`h-1 ${kpi.color} rounded mt-3 w-12`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Alertas de Licenças</h2>
          <div className="space-y-3">
            {alertas.map((a) => (
              <div key={a.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{a.label}</span>
                <span className={`text-lg font-bold ${a.level}`}>{a.value}</span>
              </div>
            ))}
          </div>
          <a href="/admin/licencas" className="inline-block mt-4 text-sm text-blue-400 hover:text-blue-300">
            Ver todas as licenças →
          </a>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Planos</h2>
          <div className="space-y-3">
            {data.planos.map((p) => (
              <div key={p.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <span className="text-sm text-white capitalize">{p.nome}</span>
                  {!p.ativo && <span className="ml-2 text-xs text-red-400">(inativo)</span>}
                </div>
                <div className="text-xs sm:text-sm text-gray-300 text-right">
                  {p.precoSetup > 0 && (
                    <span className="block text-amber-400/90">
                      Setup R$ {p.precoSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  <span>
                    R$ {p.precoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </span>
                </div>
              </div>
            ))}
          </div>
          <a href="/admin/planos" className="inline-block mt-4 text-sm text-blue-400 hover:text-blue-300">
            Gerenciar planos →
          </a>
        </div>
      </div>
    </div>
  );
}
