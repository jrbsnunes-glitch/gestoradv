'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const AREAS = [
  'TRABALHISTA', 'CIVIL', 'PENAL', 'FAMILIA', 'TRIBUTARIO',
  'PREVIDENCIARIO', 'ADMINISTRATIVO', 'EMPRESARIAL', 'CONSUMIDOR',
  'AMBIENTAL', 'OUTRO',
] as const;

const AREA_LABELS: Record<string, string> = {
  TRABALHISTA: 'Trabalhista', CIVIL: 'Civil', PENAL: 'Penal',
  FAMILIA: 'Família', TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário',
  ADMINISTRATIVO: 'Administrativo', EMPRESARIAL: 'Empresarial',
  CONSUMIDOR: 'Consumidor', AMBIENTAL: 'Ambiental', OUTRO: 'Outro',
};

const OAB_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

interface Advogado {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  oabNumber?: string;
  oabState?: string;
  isActive: boolean;
  especialidades: string[];
  percentualEscritorio: number | null;
  createdAt: string;
  _count: { processos: number };
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  oabNumber: string;
  oabState: string;
  especialidades: string[];
  percentualEscritorio: number;
}

const emptyForm: FormData = {
  name: '', email: '', phone: '', oabNumber: '', oabState: '',
  especialidades: [], percentualEscritorio: 70,
};

export default function AdvogadosPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');

  const { data: advogados = [], isLoading } = useQuery<Advogado[]>({
    queryKey: ['advogados'],
    queryFn: () => api.get('/users/advogados'),
  });

  const createMut = useMutation({
    mutationFn: (data: FormData) => api.post('/users/advogados', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advogados'] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/users/advogados/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advogados'] }); closeModal(); },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(adv: Advogado) {
    setEditingId(adv.id);
    setForm({
      name: adv.name,
      email: adv.email,
      phone: adv.phone || '',
      oabNumber: adv.oabNumber || '',
      oabState: adv.oabState || '',
      especialidades: adv.especialidades || [],
      percentualEscritorio: adv.percentualEscritorio ?? 70,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    if (editingId) {
      const { email, ...rest } = form;
      updateMut.mutate({ id: editingId, data: rest });
    } else {
      createMut.mutate(form);
    }
  }

  function toggleEspecialidade(area: string) {
    setForm(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(area)
        ? prev.especialidades.filter(a => a !== area)
        : [...prev.especialidades, area],
    }));
  }

  function toggleActive(adv: Advogado) {
    updateMut.mutate({ id: adv.id, data: { isActive: !adv.isActive } });
  }

  const filtered = advogados.filter(a => {
    if (filterStatus === 'ativos') return a.isActive;
    if (filterStatus === 'inativos') return !a.isActive;
    return true;
  });

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advogados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie a equipe de advogados do escritório</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
            + Novo Advogado
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {(['todos', 'ativos', 'inativos'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
          >
            {s === 'todos' ? 'Todos' : s === 'ativos' ? 'Ativos' : 'Inativos'} ({
              s === 'todos' ? advogados.length :
              s === 'ativos' ? advogados.filter(a => a.isActive).length :
              advogados.filter(a => !a.isActive).length
            })
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          <p>Nenhum advogado encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(adv => (
            <div key={adv.id} className={`rounded-xl border bg-card p-5 transition hover:shadow-md ${!adv.isActive ? 'opacity-60 border-border' : 'border-border'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {adv.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{adv.name}</h3>
                    <p className="text-xs text-muted-foreground">{adv.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${adv.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {adv.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                {adv.oabNumber && (
                  <div>OAB: <span className="font-medium text-foreground">{adv.oabNumber}/{adv.oabState}</span></div>
                )}
                {adv.phone && <div>Tel: {adv.phone}</div>}
                <div>Processos: <span className="font-medium text-foreground">{adv._count.processos}</span></div>
                <div>
                  Divisao: <span className="font-medium text-foreground">{adv.percentualEscritorio ?? 70}% escritorio</span>
                  {' / '}
                  <span className="font-medium text-foreground">{100 - (adv.percentualEscritorio ?? 70)}% advogado</span>
                </div>
              </div>

              {adv.especialidades?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {adv.especialidades.map(e => (
                    <span key={e} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {AREA_LABELS[e] || e}
                    </span>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="flex gap-2 border-t border-border pt-3">
                  <button onClick={() => openEdit(adv)} className="text-xs text-primary hover:underline">Editar</button>
                  <button onClick={() => toggleActive(adv)} className={`text-xs hover:underline ${adv.isActive ? 'text-red-600' : 'text-green-600'}`}>
                    {adv.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">{editingId ? 'Editar Advogado' : 'Novo Advogado'}</h2>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome completo *</label>
                <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              {!editingId && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
                  <input type="email" className={inputClass} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  <p className="mt-1 text-[10px] text-muted-foreground">Senha temporaria: mudar@123</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</label>
                  <input className={inputClass} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">OAB</label>
                    <input className={inputClass} value={form.oabNumber} onChange={e => setForm(p => ({ ...p, oabNumber: e.target.value }))} placeholder="123456" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">UF</label>
                    <select className={inputClass} value={form.oabState} onChange={e => setForm(p => ({ ...p, oabState: e.target.value }))}>
                      <option value="">UF</option>
                      {OAB_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Especialidades</label>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleEspecialidade(area)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        form.especialidades.includes(area)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {AREA_LABELS[area]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Divisao Financeira - Escritorio: {form.percentualEscritorio}% / Advogado: {100 - form.percentualEscritorio}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.percentualEscritorio}
                  onChange={e => setForm(p => ({ ...p, percentualEscritorio: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0% escritorio</span>
                  <span>50/50</span>
                  <span>100% escritorio</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || (!editingId && !form.email) || createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>

            {(createMut.isError || updateMut.isError) && (
              <p className="px-6 pb-4 text-xs text-red-600">
                {((createMut.error || updateMut.error) as any)?.message || 'Erro ao salvar'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
