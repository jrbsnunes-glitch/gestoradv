'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';

interface Tenant {
  id: string;
  slug: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  isActive: boolean;
  license?: { ativa: boolean; validade: string; plano: string; chave: string };
  plan?: { nome: string };
}

export default function LicencasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');

  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) { router.push('/admin/login'); } else { setReady(true); }
  }, [router]);

  const tenantsQuery = useQuery<{ data: Tenant[] }>({
    queryKey: ['admin-tenants-licenses'],
    queryFn: () => adminApi.get('/admin/tenants?limit=200'),
    enabled: ready,
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, dias }: { id: string; dias: number }) =>
      adminApi.post(`/admin/tenants/${id}/license/renew`, { dias }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants-licenses'] }),
  });

  if (!ready) return null;

  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const allTenants = tenantsQuery.data?.data || [];

  const filtered = allTenants.filter((t) => {
    if (!t.license) return filter === 'all' || filter === 'expired';
    const val = new Date(t.license.validade);
    switch (filter) {
      case 'valid': return val > in30d && t.license.ativa;
      case 'expiring': return val <= in30d && val > now && t.license.ativa;
      case 'expired': return val <= now || !t.license.ativa;
      default: return true;
    }
  });

  const counts = {
    all: allTenants.length,
    valid: allTenants.filter((t) => t.license && new Date(t.license.validade) > in30d && t.license.ativa).length,
    expiring: allTenants.filter((t) => t.license && new Date(t.license.validade) <= in30d && new Date(t.license.validade) > now && t.license.ativa).length,
    expired: allTenants.filter((t) => !t.license || new Date(t.license.validade) <= now || !t.license?.ativa).length,
  };

  const tabs = [
    { key: 'all' as const, label: 'Todas', count: counts.all },
    { key: 'valid' as const, label: 'Válidas', count: counts.valid },
    { key: 'expiring' as const, label: 'Expirando', count: counts.expiring },
    { key: 'expired' as const, label: 'Expiradas', count: counts.expired },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Licenças</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              filter === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Escritório</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Plano</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Validade</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const val = t.license ? new Date(t.license.validade) : null;
              const isValid = val && val > now && t.license?.ativa;
              const isExpiring = val && val <= in30d && val > now;
              const daysLeft = val ? Math.ceil((val.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

              return (
                <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-750 transition">
                  <td className="px-4 py-3">
                    <a href={`/admin/escritorios/${t.id}`} className="text-white font-medium hover:text-blue-400">
                      {t.nomeFantasia || t.razaoSocial}
                    </a>
                    <div className="text-xs text-gray-400">{t.cnpj}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 capitalize">
                    {t.license?.plano || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {val ? (
                      <div>
                        <div className="text-gray-300">{val.toLocaleDateString('pt-BR')}</div>
                        {isValid && <div className={`text-xs ${isExpiring ? 'text-yellow-400' : 'text-green-400'}`}>{daysLeft} dias restantes</div>}
                        {!isValid && <div className="text-xs text-red-400">Expirada</div>}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${isValid ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {isValid ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => renewMutation.mutate({ id: t.id, dias: 30 })}
                      disabled={renewMutation.isPending}
                      className="text-xs text-green-400 hover:text-green-300 mr-3"
                    >
                      +30 dias
                    </button>
                    <a href={`/admin/escritorios/${t.id}`} className="text-xs text-blue-400 hover:text-blue-300">
                      Gerenciar
                    </a>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma licença encontrada nesta categoria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
