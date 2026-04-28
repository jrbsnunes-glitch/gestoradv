'use client';

import { Suspense, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth';

const STATUSES = [
  { key: 'PENDENTE', label: 'Pendente' },
  { key: 'EM_ANDAMENTO', label: 'Em andamento' },
  { key: 'CONCLUIDA', label: 'Concluída' },
];

const PRIORIDADE_COLORS: Record<string, string> = {
  URGENTE: 'border-destructive/40 bg-destructive/5',
  ALTA: 'border-warning/40 bg-warning/5',
  MEDIA: 'border-border',
  BAIXA: 'border-border bg-muted/30',
};

interface TarefaForm {
  titulo: string;
  descricao?: string;
  processoId?: string;
  responsavelId?: string;
  prioridade: string;
  dataLimite?: string;
}

interface Prazo {
  id: string;
  descricao: string;
  dataLimite: string;
  urgencia: string;
  status: string;
}

interface PrazoForm {
  processoId: string;
  descricao: string;
  dataLimite: string;
  urgencia: string;
  observacoes?: string;
}

function PrazosProcessuaisSection() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['prazos'],
    queryFn: () => api.get<any>('/prazos?status=PENDENTE'),
  });

  const { data: processosData } = useQuery({
    queryKey: ['processos-list'],
    queryFn: () => api.get<any>('/processos?limit=100'),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (data: PrazoForm) => api.post('/prazos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prazos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['prazos-upcoming'] });
      setShowForm(false);
    },
  });

  const doneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/prazos/${id}/done`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prazos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['prazos-upcoming'] });
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PrazoForm>({
    defaultValues: { urgencia: 'MEDIA' },
  });

  const onSubmit = (data: PrazoForm) => createMutation.mutate(data);
  const openForm = () => { reset({ urgencia: 'MEDIA' }); createMutation.reset(); setShowForm(true); };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openForm} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90">
          Novo Prazo
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data?.data?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum prazo pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((prazo: any) => {
            const days = daysUntil(prazo.dataLimite);
            return (
              <div
                key={prazo.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-5 transition',
                  days <= 1 && 'border-destructive/30 bg-destructive/5',
                  days > 1 && days <= 3 && 'border-warning/30 bg-warning/5',
                  days > 3 && 'border-border bg-card',
                )}
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{prazo.descricao}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Processo: {prazo.processo?.numero} | Advogado: {prazo.processo?.advogado?.name}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(prazo.dataLimite).toLocaleDateString('pt-BR')}
                    </p>
                    <p className={cn('text-xs font-medium', days <= 1 && 'text-destructive', days > 1 && days <= 3 && 'text-warning', days > 3 && 'text-muted-foreground')}>
                      {days < 0 ? 'VENCIDO' : days === 0 ? 'HOJE' : `${days} dia(s)`}
                    </p>
                  </div>
                  <button
                    onClick={() => doneMutation.mutate(prazo.id)}
                    disabled={doneMutation.isPending}
                    className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition hover:bg-success/20"
                  >
                    Cumprido
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Prazo">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {createMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(createMutation.error as Error).message}</div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Processo *</label>
            <select {...register('processoId', { required: 'Selecione um processo' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
              <option value="">Selecione...</option>
              {processosData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.numero} - {p.cliente?.user?.name}</option>
              ))}
            </select>
            {errors.processoId && <p className="mt-1 text-xs text-destructive">{errors.processoId.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Descrição *</label>
            <input {...register('descricao', { required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Prazo para contestação" />
            {errors.descricao && <p className="mt-1 text-xs text-destructive">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Data limite *</label>
              <input {...register('dataLimite', { required: 'Obrigatório' })} type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
              {errors.dataLimite && <p className="mt-1 text-xs text-destructive">{errors.dataLimite.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Urgência</label>
              <select {...register('urgencia')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Observações</label>
            <textarea {...register('observacoes')} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Salvando...' : 'Salvar Prazo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TarefasBoard() {
  const [showForm, setShowForm] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<any>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => api.get<any>('/tarefas'),
  });

  const { data: processosData } = useQuery({
    queryKey: ['processos-list'],
    queryFn: () => api.get<any>('/processos?limit=100'),
    enabled: showForm,
  });

  const { data: advogadosData } = useQuery({
    queryKey: ['advogados-list'],
    queryFn: () => api.get<any>('/users/advogados'),
    enabled: showForm,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TarefaForm>({
    defaultValues: { prioridade: 'MEDIA' },
  });

  const watchProcessoId = watch('processoId');

  const { data: prazosData } = useQuery({
    queryKey: ['prazos-processo', watchProcessoId],
    queryFn: () => api.get<Prazo[]>(`/prazos/processo/${watchProcessoId}`),
    enabled: showForm && !!watchProcessoId,
  });

  const createMutation = useMutation({
    mutationFn: (data: TarefaForm) => api.post('/tarefas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TarefaForm }) => api.put(`/tarefas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      closeForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tarefas/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingTarefa(null);
  };

  const openCreate = () => {
    setEditingTarefa(null);
    reset({ prioridade: 'MEDIA', titulo: '', descricao: '', processoId: '', responsavelId: '', dataLimite: '' });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const openEdit = (tarefa: any) => {
    setEditingTarefa(tarefa);
    const dl = tarefa.dataLimite ? new Date(tarefa.dataLimite).toISOString().slice(0, 16) : '';
    reset({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      processoId: tarefa.processoId || '',
      responsavelId: tarefa.responsavelId || '',
      prioridade: tarefa.prioridade,
      dataLimite: dl,
    });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const onSubmit = (formData: TarefaForm) => {
    const payload = { ...formData, processoId: formData.processoId || undefined, responsavelId: formData.responsavelId || undefined };
    if (editingTarefa) {
      updateMutation.mutate({ id: editingTarefa.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const usePrazoDate = (prazo: Prazo) => {
    const dt = new Date(prazo.dataLimite).toISOString().slice(0, 16);
    setValue('dataLimite', dt);
    const currentDesc = watch('descricao');
    if (!currentDesc) {
      setValue('descricao', prazo.descricao);
    }
  };

  const activeMutation = editingTarefa ? updateMutation : createMutation;
  const tarefas = data?.data || [];
  const advogados = Array.isArray(advogadosData) ? advogadosData : (advogadosData?.data || []);
  const prazos: Prazo[] = Array.isArray(prazosData) ? prazosData : [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90">
          Nova Tarefa
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {STATUSES.map((status) => {
            const items = tarefas.filter((t: any) => t.status === status.key);
            return (
              <div key={status.key}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    items.map((tarefa: any) => (
                      <div key={tarefa.id} className={cn('rounded-lg border p-4', PRIORIDADE_COLORS[tarefa.prioridade] || 'border-border')}>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-foreground">{tarefa.titulo}</p>
                          <button onClick={() => openEdit(tarefa)} className="ml-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                            </svg>
                          </button>
                        </div>
                        {tarefa.descricao && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tarefa.descricao}</p>}
                        {tarefa.responsavel && (
                          <p className="mt-1 text-xs text-muted-foreground">Resp: {tarefa.responsavel.name}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tarefa.processo && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tarefa.processo.numero?.slice(0, 15)}...</span>
                            )}
                            <span className={cn(
                              'rounded px-1.5 py-0.5 text-xs font-medium',
                              tarefa.prioridade === 'URGENTE' && 'bg-destructive/10 text-destructive',
                              tarefa.prioridade === 'ALTA' && 'bg-warning/10 text-warning',
                              tarefa.prioridade === 'MEDIA' && 'bg-info/10 text-info',
                              tarefa.prioridade === 'BAIXA' && 'bg-muted text-muted-foreground',
                            )}>
                              {tarefa.prioridade}
                            </span>
                          </div>
                          {tarefa.dataLimite && <span className="text-xs text-muted-foreground">{formatDate(tarefa.dataLimite)}</span>}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {tarefa.status === 'PENDENTE' && (
                            <button onClick={() => statusMutation.mutate({ id: tarefa.id, status: 'EM_ANDAMENTO' })} className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10">Iniciar</button>
                          )}
                          {tarefa.status !== 'CONCLUIDA' && (
                            <button onClick={() => statusMutation.mutate({ id: tarefa.id, status: 'CONCLUIDA' })} className="rounded px-2 py-1 text-xs text-success hover:bg-success/10">Concluir</button>
                          )}
                          {tarefa.status === 'CONCLUIDA' && (
                            <button onClick={() => statusMutation.mutate({ id: tarefa.id, status: 'PENDENTE' })} className="rounded px-2 py-1 text-xs text-warning hover:bg-warning/10">Reabrir</button>
                          )}
                          {tarefa.status === 'EM_ANDAMENTO' && (
                            <button onClick={() => statusMutation.mutate({ id: tarefa.id, status: 'PENDENTE' })} className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Pausar</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'} className="max-w-2xl">
        <div className="flex gap-4">
          <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', prazos.length > 0 ? 'flex-1' : 'w-full')}>
            {activeMutation.error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(activeMutation.error as Error).message}</div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Título *</label>
              <input {...register('titulo', { required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
              {errors.titulo && <p className="mt-1 text-xs text-destructive">{errors.titulo.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descrição</label>
              <textarea {...register('descricao')} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Processo (opcional)</label>
              <select {...register('processoId')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option value="">Nenhum</option>
                {processosData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Responsável</label>
              {isAdmin ? (
                <select {...register('responsavelId')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                  <option value="">Selecione...</option>
                  {advogados.map((a: any) => <option key={a.id} value={a.id}>{a.name} {a.oabNumber ? `(OAB ${a.oabState} ${a.oabNumber})` : ''}</option>)}
                </select>
              ) : (
                <input value={user?.email || ''} disabled className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prioridade</label>
                <select {...register('prioridade')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Data limite</label>
                <input {...register('dataLimite')} type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={closeForm} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
              <button type="submit" disabled={activeMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
                {activeMutation.isPending ? 'Salvando...' : editingTarefa ? 'Salvar Alterações' : 'Salvar Tarefa'}
              </button>
            </div>
          </form>

          {prazos.length > 0 && (
            <div className="w-56 shrink-0 border-l border-border pl-4">
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Prazos do Processo</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {prazos.map((prazo) => {
                  const dLeft = Math.ceil((new Date(prazo.dataLimite).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={prazo.id} className="rounded-lg border border-border p-2.5">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{prazo.descricao}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className={cn(
                          'text-xs font-medium',
                          dLeft <= 3 ? 'text-destructive' : dLeft <= 7 ? 'text-warning' : 'text-muted-foreground'
                        )}>
                          {formatDate(prazo.dataLimite)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className={cn(
                          'text-[10px] rounded px-1 py-0.5',
                          prazo.urgencia === 'CRITICA' && 'bg-destructive/10 text-destructive',
                          prazo.urgencia === 'ALTA' && 'bg-warning/10 text-warning',
                          prazo.urgencia === 'MEDIA' && 'bg-info/10 text-info',
                          prazo.urgencia === 'BAIXA' && 'bg-muted text-muted-foreground',
                        )}>
                          {prazo.urgencia}
                        </span>
                        <button
                          type="button"
                          onClick={() => usePrazoDate(prazo)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
                        >
                          Usar data
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function TarefasPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subtab = searchParams.get('tab') === 'prazos' ? 'prazos' : 'tarefas';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tarefas internas e prazos processuais do escritório</p>
        <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => router.replace('/dashboard/tarefas')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition',
              subtab === 'tarefas' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Tarefas
          </button>
          <button
            type="button"
            onClick={() => router.replace('/dashboard/tarefas?tab=prazos')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition',
              subtab === 'prazos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Prazos processuais
          </button>
        </div>
      </div>

      {subtab === 'tarefas' ? <TarefasBoard /> : <PrazosProcessuaisSection />}
    </div>
  );
}

export default function TarefasPage() {
  return (
    <Suspense fallback={<p className="p-2 text-sm text-muted-foreground">Carregando...</p>}>
      <TarefasPageInner />
    </Suspense>
  );
}
