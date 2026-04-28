'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatCurrency, cn, daysUntil } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { Modal } from '@/components/ui/modal';

const AREAS = ['TRABALHISTA','CIVIL','PENAL','FAMILIA','TRIBUTARIO','PREVIDENCIARIO','ADMINISTRATIVO','EMPRESARIAL','CONSUMIDOR','AMBIENTAL','OUTRO'] as const;
const STATUSES = ['ATIVO','ARQUIVADO','SUSPENSO','ENCERRADO','EM_RECURSO'] as const;
const RESULTADOS = [
  { value: 'GANHO', label: 'Ganho' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'ACORDO', label: 'Acordo' },
  { value: 'DESISTENCIA', label: 'Desistência' },
] as const;

interface EditForm {
  numero: string;
  tribunal: string;
  vara?: string;
  comarca?: string;
  area: string;
  valorCausa?: number;
  descricao?: string;
  status?: string;
}

interface ConcluirForm {
  resultado: string;
  valorReceber?: number;
  dataPrevistaPagamento?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO: 'bg-primary/10 text-primary',
  ARQUIVADO: 'bg-muted text-muted-foreground',
  SUSPENSO: 'bg-warning/10 text-warning',
  ENCERRADO: 'bg-success/10 text-success',
  EM_RECURSO: 'bg-info/10 text-info',
};

export default function ProcessoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showConcluir, setShowConcluir] = useState(false);

  const { data: processo, isLoading } = useQuery({
    queryKey: ['processo', id],
    queryFn: () => api.get<any>(`/processos/${id}`),
  });

  const { data: advogados = [] } = useQuery<any[]>({
    queryKey: ['advogados'],
    queryFn: () => api.get('/users/advogados'),
    enabled: showEdit,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => api.get<any>('/clients?limit=200'),
    enabled: showEdit,
  });

  const editForm = useForm<EditForm>();
  const concluirForm = useForm<ConcluirForm>();

  const isAdmin = user?.role === 'ADMIN';
  const watchResultado = concluirForm.watch('resultado');
  const showValorFields = watchResultado === 'GANHO' || watchResultado === 'ACORDO';

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) =>
      api.put(`/processos/${id}`, { ...data, valorCausa: data.valorCausa ? Number(data.valorCausa) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processo', id] });
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      setShowEdit(false);
    },
  });

  const concluirMutation = useMutation({
    mutationFn: (data: ConcluirForm) =>
      api.post(`/processos/${id}/concluir`, {
        resultado: data.resultado,
        valorReceber: data.valorReceber ? Number(data.valorReceber) : undefined,
        dataPrevistaPagamento: data.dataPrevistaPagamento || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processo', id] });
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      queryClient.invalidateQueries({ queryKey: ['fin-lancamentos'] });
      setShowConcluir(false);
    },
  });

  const openEdit = () => {
    if (!processo) return;
    editForm.reset({
      numero: processo.numero,
      tribunal: processo.tribunal,
      vara: processo.vara || '',
      comarca: processo.comarca || '',
      area: processo.area,
      valorCausa: processo.valorCausa ? Number(processo.valorCausa) : undefined,
      descricao: processo.descricao || '',
      status: processo.status,
    });
    updateMutation.reset();
    setShowEdit(true);
  };

  const openConcluir = () => {
    concluirForm.reset({ resultado: '', valorReceber: undefined, dataPrevistaPagamento: '' });
    concluirMutation.reset();
    setShowConcluir(true);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!processo) {
    return <div className="text-sm text-destructive">Processo não encontrado</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/processos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
          Voltar aos processos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{processo.numero}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {processo.tribunal} | {processo.vara} | {processo.comarca}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openEdit} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
              Editar
            </button>
            {processo.status !== 'ENCERRADO' && (
              <button onClick={openConcluir} className="rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-white hover:bg-success/90">
                Concluir
              </button>
            )}
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[processo.status] || 'bg-muted text-muted-foreground'}`}>
              {processo.status}
            </span>
            {processo.resultado && (
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                {processo.resultado}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Área:</span>
                <span className="ml-2 font-medium text-foreground">{processo.area}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor da causa:</span>
                <span className="ml-2 font-medium text-foreground">{processo.valorCausa ? formatCurrency(Number(processo.valorCausa)) : 'Não informado'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Advogado:</span>
                <span className="ml-2 font-medium text-foreground">{processo.advogado?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <span className="ml-2 font-medium text-foreground">{processo.cliente?.user?.name}</span>
              </div>
              {processo.concluidoEm && (
                <div>
                  <span className="text-muted-foreground">Concluído em:</span>
                  <span className="ml-2 font-medium text-foreground">{formatDate(processo.concluidoEm)}</span>
                </div>
              )}
            </div>
            {processo.descricao && (
              <p className="mt-4 text-sm text-muted-foreground">{processo.descricao}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Movimentações</h2>
            {!processo.movimentacoes?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                {processo.movimentacoes.map((mov: any) => (
                  <div key={mov.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div className="relative z-10 mt-1.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-primary bg-card" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{mov.descricao}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{formatDateTime(mov.data)}</span>
                        {mov.tipo && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{mov.tipo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Prazos Pendentes</h2>
            {!processo.prazos?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum prazo pendente</p>
            ) : (
              <div className="space-y-3">
                {processo.prazos.map((prazo: any) => {
                  const days = daysUntil(prazo.dataLimite);
                  return (
                    <div key={prazo.id} className={cn(
                      'rounded-lg border p-3',
                      days <= 1 && 'border-destructive/30 bg-destructive/5',
                      days > 1 && days <= 3 && 'border-warning/30 bg-warning/5',
                      days > 3 && 'border-border',
                    )}>
                      <p className="text-sm font-medium text-foreground">{prazo.descricao}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatDate(prazo.dataLimite)}</span>
                        <span className={cn(
                          'text-xs font-medium',
                          days <= 1 && 'text-destructive',
                          days > 1 && days <= 3 && 'text-warning',
                          days > 3 && 'text-muted-foreground',
                        )}>
                          {days < 0 ? 'VENCIDO' : days === 0 ? 'HOJE' : `${days}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Documentos</h2>
            {!processo.documentos?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {processo.documentos.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    </svg>
                    <span className="text-sm text-foreground">{doc.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Cliente</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{processo.cliente?.user?.name}</p>
              <p className="text-muted-foreground">{processo.cliente?.user?.email}</p>
              {processo.cliente?.user?.phone && (
                <p className="text-muted-foreground">{processo.cliente.user.phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar Processo */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Processo" className="max-w-2xl">
        <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          {updateMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(updateMutation.error as Error).message}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Número *</label>
              <input {...editForm.register('numero', { required: true })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tribunal *</label>
              <input {...editForm.register('tribunal', { required: true })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Vara</label>
              <input {...editForm.register('vara')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Comarca</label>
              <input {...editForm.register('comarca')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Área *</label>
              <select {...editForm.register('area')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Valor (R$)</label>
              <input {...editForm.register('valorCausa')} type="number" step="0.01" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <select {...editForm.register('status')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Descrição</label>
            <textarea {...editForm.register('descricao')} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Concluir Processo */}
      <Modal open={showConcluir} onClose={() => setShowConcluir(false)} title="Concluir Processo">
        <form onSubmit={concluirForm.handleSubmit((d) => concluirMutation.mutate(d))} className="space-y-4">
          {concluirMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(concluirMutation.error as Error).message}</div>
          )}

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{processo.numero}</p>
            <p className="text-xs text-muted-foreground">{processo.area} - {processo.cliente?.user?.name}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Resultado *</label>
            <select {...concluirForm.register('resultado', { required: 'Selecione' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
              <option value="">Selecione...</option>
              {RESULTADOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {concluirForm.formState.errors.resultado && <p className="mt-1 text-xs text-destructive">{concluirForm.formState.errors.resultado.message}</p>}
          </div>

          {showValorFields && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">Gerar conta a receber (opcional)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Valor (R$)</label>
                  <input {...concluirForm.register('valorReceber')} type="number" step="0.01" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Data Pagamento</label>
                  <input {...concluirForm.register('dataPrevistaPagamento')} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-xs font-medium text-warning">Atenção</p>
            <p className="text-xs text-muted-foreground">
              Prazos pendentes serão cancelados e tarefas em andamento serão encerradas.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowConcluir(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={concluirMutation.isPending} className="rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-success/90 disabled:opacity-50">
              {concluirMutation.isPending ? 'Concluindo...' : 'Confirmar Conclusão'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
