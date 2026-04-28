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
  email: string;
  telefone?: string;
  isActive: boolean;
  createdAt: string;
  license?: { ativa: boolean; validade: string; plano: string };
  plan?: { nome: string };
}

interface Plan {
  id: string;
  nome: string;
}

export default function EscritoriosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    slug: '', cnpj: '', razaoSocial: '', nomeFantasia: '', email: '', telefone: '',
    planId: '', adminName: '', adminEmail: '', adminPassword: '',
  });

  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) { router.push('/admin/login'); } else { setReady(true); }
  }, [router]);

  const tenantsQuery = useQuery<{ data: Tenant[]; meta: any }>({
    queryKey: ['admin-tenants', search],
    queryFn: () => adminApi.get(`/admin/tenants?search=${encodeURIComponent(search)}&limit=50`),
    enabled: ready,
  });

  const plansQuery = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.get('/admin/plans'),
    enabled: ready,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.post('/admin/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      setShowForm(false);
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      adminApi.post(`/admin/tenants/${id}/${activate ? 'activate' : 'deactivate'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  const resetForm = () => setForm({ slug: '', cnpj: '', razaoSocial: '', nomeFantasia: '', email: '', telefone: '', planId: '', adminName: '', adminEmail: '', adminPassword: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, planId: form.planId || undefined });
  };

  if (!ready) return null;

  const tenants = tenantsQuery.data?.data || [];
  const plans = plansQuery.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Escritórios</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
          {showForm ? 'Cancelar' : '+ Novo Escritório'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Provisionar Novo Escritório</h2>
          {createMutation.isError && (
            <div className="bg-red-900/30 border border-red-600 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
              {(createMutation.error as Error).message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slug (subdomínio) *</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="abc-advocacia" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">CNPJ *</label>
              <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="12.345.678/0001-90" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Razão Social *</label>
              <input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome Fantasia</label>
              <input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">E-mail *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Plano</label>
              <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                <option value="">Trial (padrão)</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <h3 className="text-md font-semibold text-white mt-6 mb-3">Admin do Escritório</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome do Admin *</label>
              <input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">E-mail do Admin *</label>
              <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Senha do Admin *</label>
              <input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required minLength={6} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition">
              {createMutation.isPending ? 'Provisionando...' : 'Criar Escritório'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por razão social, CNPJ, slug..."
          className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
        />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-750 border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Escritório</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">CNPJ</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Plano</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Licença</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const licValid = t.license ? new Date(t.license.validade) > new Date() : false;
              return (
                <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-750 transition">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{t.nomeFantasia || t.razaoSocial}</div>
                    <div className="text-xs text-gray-400">{t.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{t.cnpj}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-300">{t.plan?.nome || t.license?.plano || 'trial'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.license ? (
                      <span className={`px-2 py-1 rounded text-xs ${licValid && t.license.ativa ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {licValid && t.license.ativa ? 'Válida' : 'Expirada/Revogada'}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">Sem licença</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${t.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {t.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <a href={`/admin/escritorios/${t.id}`} className="text-blue-400 hover:text-blue-300 text-xs">
                      Detalhes
                    </a>
                    <button
                      onClick={() => toggleMutation.mutate({ id: t.id, activate: !t.isActive })}
                      className={`text-xs ${t.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                    >
                      {t.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhum escritório encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
