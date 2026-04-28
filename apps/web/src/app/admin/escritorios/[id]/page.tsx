'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';

interface Tenant {
  id: string;
  slug: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  email: string;
  telefone?: string;
  databaseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  license?: {
    id: string;
    chave: string;
    plano: string;
    ativa: boolean;
    validade: string;
    ultimaValidacao?: string;
    historico?: Array<{ acao: string; data: string; [key: string]: any }>;
  };
  plan?: { id: string; nome: string; precoMensal: number };
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ razaoSocial: '', nomeFantasia: '', email: '', telefone: '' });

  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) { router.push('/admin/login'); } else { setReady(true); }
  }, [router]);

  const tenantQuery = useQuery<Tenant>({
    queryKey: ['admin-tenant', id],
    queryFn: () => adminApi.get(`/admin/tenants/${id}`),
    enabled: ready,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApi.patch(`/admin/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
      setEditing(false);
    },
  });

  const generateLicMutation = useMutation({
    mutationFn: () => adminApi.post(`/admin/tenants/${id}/license/generate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  });

  const revokeLicMutation = useMutation({
    mutationFn: () => adminApi.post(`/admin/tenants/${id}/license/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  });

  const renewLicMutation = useMutation({
    mutationFn: (dias: number) => adminApi.post(`/admin/tenants/${id}/license/renew`, { dias }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (activate: boolean) => adminApi.post(`/admin/tenants/${id}/${activate ? 'activate' : 'deactivate'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] }),
  });

  if (!ready || tenantQuery.isLoading) {
    return <div className="text-gray-400 p-8">Carregando...</div>;
  }

  const t = tenantQuery.data;
  if (!t) return <div className="text-gray-400 p-8">Escritório não encontrado</div>;

  const licValid = t.license ? new Date(t.license.validade) > new Date() && t.license.ativa : false;

  const startEdit = () => {
    setEditForm({ razaoSocial: t.razaoSocial, nomeFantasia: t.nomeFantasia || '', email: t.email, telefone: t.telefone || '' });
    setEditing(true);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/admin/escritorios')} className="text-gray-400 hover:text-white transition">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-white">{t.nomeFantasia || t.razaoSocial}</h1>
        <span className={`px-3 py-1 rounded text-xs ${t.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {t.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Cadastrais */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Dados Cadastrais</h2>
            <div className="flex gap-2">
              {!editing && (
                <button onClick={startEdit} className="text-sm text-blue-400 hover:text-blue-300">Editar</button>
              )}
              <button
                onClick={() => toggleMutation.mutate(!t.isActive)}
                className={`text-sm ${t.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
              >
                {t.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm); }} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Razão Social</label>
                <input value={editForm.razaoSocial} onChange={(e) => setEditForm({ ...editForm, razaoSocial: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome Fantasia</label>
                <input value={editForm.nomeFantasia} onChange={(e) => setEditForm({ ...editForm, nomeFantasia: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                <input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Salvar</button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-400">Slug:</span> <span className="text-white ml-2">{t.slug}</span></div>
              <div><span className="text-gray-400">CNPJ:</span> <span className="text-white ml-2">{t.cnpj}</span></div>
              <div><span className="text-gray-400">Razão Social:</span> <span className="text-white ml-2">{t.razaoSocial}</span></div>
              <div><span className="text-gray-400">Nome Fantasia:</span> <span className="text-white ml-2">{t.nomeFantasia || '-'}</span></div>
              <div><span className="text-gray-400">E-mail:</span> <span className="text-white ml-2">{t.email}</span></div>
              <div><span className="text-gray-400">Telefone:</span> <span className="text-white ml-2">{t.telefone || '-'}</span></div>
              <div><span className="text-gray-400">Database:</span> <span className="text-white ml-2 font-mono text-xs">{t.databaseName}</span></div>
              <div><span className="text-gray-400">Plano:</span> <span className="text-white ml-2 capitalize">{t.plan?.nome || 'trial'}</span></div>
              <div><span className="text-gray-400">Criado em:</span> <span className="text-white ml-2">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span></div>
            </div>
          )}
        </div>

        {/* Licença */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Licença</h2>

          {t.license ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded text-sm font-medium ${licValid ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {licValid ? 'Licença Válida' : 'Licença Inválida'}
                </span>
              </div>

              <div className="text-sm space-y-2">
                <div><span className="text-gray-400">Chave:</span> <span className="text-white ml-2 font-mono text-xs break-all">{t.license.chave}</span></div>
                <div><span className="text-gray-400">Plano:</span> <span className="text-white ml-2 capitalize">{t.license.plano}</span></div>
                <div><span className="text-gray-400">Validade:</span> <span className="text-white ml-2">{new Date(t.license.validade).toLocaleDateString('pt-BR')}</span></div>
                {t.license.ultimaValidacao && (
                  <div><span className="text-gray-400">Última Validação:</span> <span className="text-white ml-2">{new Date(t.license.ultimaValidacao).toLocaleString('pt-BR')}</span></div>
                )}
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => renewLicMutation.mutate(30)}
                  disabled={renewLicMutation.isPending}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Renovar +30 dias
                </button>
                <button
                  onClick={() => renewLicMutation.mutate(365)}
                  disabled={renewLicMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Renovar +1 ano
                </button>
                <button
                  onClick={() => generateLicMutation.mutate()}
                  disabled={generateLicMutation.isPending}
                  className="px-3 py-1.5 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  Nova Chave
                </button>
                {t.license.ativa ? (
                  <button
                    onClick={() => { if (confirm('Revogar a licença irá bloquear o acesso ao escritório. Continuar?')) revokeLicMutation.mutate(); }}
                    disabled={revokeLicMutation.isPending}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Revogar
                  </button>
                ) : (
                  <button
                    onClick={() => generateLicMutation.mutate()}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Reativar
                  </button>
                )}
              </div>

              {/* Histórico */}
              {t.license.historico && Array.isArray(t.license.historico) && t.license.historico.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Histórico</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(t.license.historico as Array<{ acao: string; data: string }>).slice().reverse().map((h, i) => (
                      <div key={i} className="text-xs text-gray-400 flex gap-2">
                        <span className="text-gray-500">{new Date(h.data).toLocaleString('pt-BR')}</span>
                        <span className="capitalize text-gray-300">{h.acao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm mb-4">Este escritório não possui licença.</p>
              <button
                onClick={() => generateLicMutation.mutate()}
                disabled={generateLicMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Gerar Licença
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
