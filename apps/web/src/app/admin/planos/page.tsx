'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';

interface Plan {
  id: string;
  nome: string;
  descricao?: string;
  maxUsuarios: number;
  maxProcessos: number;
  maxArmazenamento: number;
  whatsappAtivo: boolean;
  iaAtiva: boolean;
  precoMensal: number;
  precoSetup: number;
  ativo: boolean;
}

const emptyForm = {
  nome: '', descricao: '', maxUsuarios: 5, maxProcessos: 100, maxArmazenamento: 1024,
  whatsappAtivo: false, iaAtiva: false, precoMensal: 0, precoSetup: 0,
};

export default function PlanosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) { router.push('/admin/login'); } else { setReady(true); }
  }, [router]);

  const plansQuery = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.get('/admin/plans'),
    enabled: ready,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.post('/admin/plans', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); setShowForm(false); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.patch(`/admin/plans/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); setEditing(null); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (plan: Plan) => {
    setForm({
      nome: plan.nome,
      descricao: plan.descricao || '',
      maxUsuarios: plan.maxUsuarios,
      maxProcessos: plan.maxProcessos,
      maxArmazenamento: plan.maxArmazenamento,
      whatsappAtivo: plan.whatsappAtivo,
      iaAtiva: plan.iaAtiva,
      precoMensal: plan.precoMensal,
      precoSetup: plan.precoSetup ?? 0,
    });
    setEditing(plan);
    setShowForm(true);
  };

  const toggleAtivo = (plan: Plan) => {
    updateMutation.mutate({ id: plan.id, data: { ativo: !plan.ativo } });
  };

  if (!ready) return null;

  const plans = plansQuery.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Planos</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancelar' : '+ Novo Plano'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Editar Plano' : 'Novo Plano'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" required disabled={!!editing} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Máx. Usuários</label>
              <input type="number" value={form.maxUsuarios} onChange={(e) => setForm({ ...form, maxUsuarios: +e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Máx. Processos</label>
              <input type="number" value={form.maxProcessos} onChange={(e) => setForm({ ...form, maxProcessos: +e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Máx. Armazenamento (MB)</label>
              <input type="number" value={form.maxArmazenamento} onChange={(e) => setForm({ ...form, maxArmazenamento: +e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Setup único — configuração (R$)</label>
              <input type="number" step="0.01" value={form.precoSetup} onChange={(e) => setForm({ ...form, precoSetup: +e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Mensalidade (R$)</label>
              <input type="number" step="0.01" value={form.precoMensal} onChange={(e) => setForm({ ...form, precoMensal: +e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.whatsappAtivo} onChange={(e) => setForm({ ...form, whatsappAtivo: e.target.checked })} className="rounded" />
                WhatsApp Bot
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.iaAtiva} onChange={(e) => setForm({ ...form, iaAtiva: e.target.checked })} className="rounded" />
                IA Ativa
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition">
              {editing ? 'Salvar' : 'Criar Plano'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-gray-800 rounded-xl p-5 border ${plan.ativo ? 'border-gray-700' : 'border-red-800/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white capitalize">{plan.nome}</h3>
              {!plan.ativo && <span className="text-xs text-red-400">Inativo</span>}
            </div>
            <p className="text-sm text-gray-400 mb-4">{plan.descricao || '-'}</p>
            <div className="mb-4 space-y-1">
              {(plan.precoSetup ?? 0) > 0 && (
                <div className="text-sm text-amber-400">
                  Setup configuração: R$ {(plan.precoSetup ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-2xl font-bold text-white">
                R$ {plan.precoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className="text-sm text-gray-400 font-normal">/mês</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-300 mb-4">
              <div className="flex justify-between"><span>Usuários</span><span className="text-white">{plan.maxUsuarios}</span></div>
              <div className="flex justify-between"><span>Processos</span><span className="text-white">{plan.maxProcessos}</span></div>
              <div className="flex justify-between"><span>Armazenamento</span><span className="text-white">{plan.maxArmazenamento} MB</span></div>
              <div className="flex justify-between"><span>WhatsApp</span><span className={plan.whatsappAtivo ? 'text-green-400' : 'text-gray-500'}>{plan.whatsappAtivo ? 'Sim' : 'Não'}</span></div>
              <div className="flex justify-between"><span>IA</span><span className={plan.iaAtiva ? 'text-green-400' : 'text-gray-500'}>{plan.iaAtiva ? 'Sim' : 'Não'}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(plan)} className="text-xs text-blue-400 hover:text-blue-300">Editar</button>
              <button onClick={() => toggleAtivo(plan)} className={`text-xs ${plan.ativo ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>
                {plan.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
