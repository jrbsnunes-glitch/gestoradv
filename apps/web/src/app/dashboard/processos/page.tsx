'use client';

import { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientSchema } from '@gestor-adv/validators';
import { z } from 'zod';
type ClientFormInput = z.input<typeof createClientSchema>;
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { Modal } from '@/components/ui/modal';

export default function ProcessosPageWrapper() {
  return <Suspense><ProcessosPage /></Suspense>;
}

const AREAS = ['TRABALHISTA','CIVIL','PENAL','FAMILIA','TRIBUTARIO','PREVIDENCIARIO','ADMINISTRATIVO','EMPRESARIAL','CONSUMIDOR','AMBIENTAL','OUTRO'] as const;
const STATUSES = ['ATIVO','ARQUIVADO','SUSPENSO','ENCERRADO','EM_RECURSO'] as const;
const RESULTADOS = [
  { value: 'GANHO', label: 'Ganho' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'ACORDO', label: 'Acordo' },
  { value: 'DESISTENCIA', label: 'Desistência' },
] as const;

interface ProcessoForm {
  numero: string;
  tribunal: string;
  vara?: string;
  comarca?: string;
  area: string;
  valorCausa?: number;
  descricao?: string;
  clienteId: string;
  advogadoId?: string;
  status?: string;
}

interface ConcluirForm {
  resultado: string;
  valorReceber?: number;
  dataPrevistaPagamento?: string;
}

function ProcessosPage() {
  const [showForm, setShowForm] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<any>(null);
  const [showConcluir, setShowConcluir] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const searchParams = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ['processos'],
    queryFn: () => api.get<any>('/processos'),
  });

  const { data: clientesData, refetch: refetchClientes } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => api.get<any>('/clients?limit=200'),
    enabled: showForm,
  });

  const { data: advogados = [] } = useQuery<any[]>({
    queryKey: ['advogados'],
    queryFn: () => api.get('/users/advogados'),
    enabled: showForm,
  });

  useEffect(() => {
    const clienteId = searchParams.get('clienteId');
    const advogadoId = searchParams.get('advogadoId');
    if (clienteId || advogadoId) {
      setShowForm(true);
      setTimeout(() => {
        if (clienteId) processoForm.setValue('clienteId', clienteId);
        if (advogadoId) processoForm.setValue('advogadoId', advogadoId);
      }, 100);
    }
  }, [searchParams]);

  const createMutation = useMutation({
    mutationFn: (data: ProcessoForm) => api.post('/processos', { ...data, valorCausa: data.valorCausa ? Number(data.valorCausa) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcessoForm }) =>
      api.put(`/processos/${id}`, { ...data, valorCausa: data.valorCausa ? Number(data.valorCausa) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
  });

  const concluirMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConcluirForm }) =>
      api.post(`/processos/${id}/concluir`, {
        resultado: data.resultado,
        valorReceber: data.valorReceber ? Number(data.valorReceber) : undefined,
        dataPrevistaPagamento: data.dataPrevistaPagamento || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['fin-lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['fin-caixa'] });
      setShowConcluir(null);
      concluirForm.reset();
    },
  });

  const clientMutation = useMutation({
    mutationFn: (data: ClientFormInput) => api.post<any>('/clients', data),
    onSuccess: (newClient) => {
      refetchClientes();
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowNewClient(false);
      if (newClient?.clientProfile?.id) {
        processoForm.setValue('clienteId', newClient.clientProfile.id);
      }
    },
  });

  const processoForm = useForm<ProcessoForm>();
  const concluirForm = useForm<ConcluirForm>();
  const clientForm = useForm<ClientFormInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { consentLgpd: true },
  });

  const watchResultado = concluirForm.watch('resultado');
  const showValorFields = watchResultado === 'GANHO' || watchResultado === 'ACORDO';

  const closeForm = () => {
    setShowForm(false);
    setEditingProcesso(null);
  };

  const openCreate = () => {
    setEditingProcesso(null);
    processoForm.reset();
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const openEdit = (processo: any) => {
    setEditingProcesso(processo);
    processoForm.reset({
      numero: processo.numero,
      tribunal: processo.tribunal,
      vara: processo.vara || '',
      comarca: processo.comarca || '',
      area: processo.area,
      valorCausa: processo.valorCausa ? Number(processo.valorCausa) : undefined,
      descricao: processo.descricao || '',
      clienteId: processo.clienteId,
      advogadoId: processo.advogadoId || '',
      status: processo.status,
    });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const openConcluir = (processo: any) => {
    concluirForm.reset({ resultado: '', valorReceber: undefined, dataPrevistaPagamento: '' });
    concluirMutation.reset();
    setShowConcluir(processo);
  };

  const onSubmitProcesso = (formData: ProcessoForm) => {
    if (editingProcesso) {
      updateMutation.mutate({ id: editingProcesso.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const onSubmitConcluir = (formData: ConcluirForm) => {
    if (showConcluir) {
      concluirMutation.mutate({ id: showConcluir.id, data: formData });
    }
  };

  const onSubmitClient = (data: ClientFormInput) => clientMutation.mutate(data);

  const openNewClient = () => {
    clientForm.reset({ consentLgpd: true });
    clientMutation.reset();
    setShowNewClient(true);
  };

  const activeMutation = editingProcesso ? updateMutation : createMutation;

  const STATUS_COLORS: Record<string, string> = {
    ATIVO: 'bg-primary/10 text-primary',
    ARQUIVADO: 'bg-muted text-muted-foreground',
    SUSPENSO: 'bg-warning/10 text-warning',
    ENCERRADO: 'bg-success/10 text-success',
    EM_RECURSO: 'bg-info/10 text-info',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Processos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie todos os processos do escritório</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90">
          Novo Processo
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Número</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Área</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Prazos</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            ) : !data?.data?.length ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum processo cadastrado</td></tr>
            ) : (
              data.data.map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/processos/${p.id}`} className="text-sm font-medium text-primary hover:underline">{p.numero}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.area}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.cliente?.user?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                    {p.resultado && <span className="ml-1 text-xs text-muted-foreground">({p.resultado})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.valorCausa ? formatCurrency(Number(p.valorCausa)) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p._count?.prazos ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">Editar</button>
                      {p.status !== 'ENCERRADO' && (
                        <button onClick={() => openConcluir(p)} className="rounded px-2 py-1 text-xs font-medium text-success hover:bg-success/10">Concluir</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Criar/Editar Processo */}
      <Modal open={showForm} onClose={closeForm} title={editingProcesso ? 'Editar Processo' : 'Novo Processo'} className="max-w-2xl">
        <form onSubmit={processoForm.handleSubmit(onSubmitProcesso)} className="space-y-4">
          {activeMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(activeMutation.error as Error).message}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Número do processo *</label>
              <input {...processoForm.register('numero', { required: 'Obrigatório' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="0001234-56.2024.8.26.0100" />
              {processoForm.formState.errors.numero && <p className="mt-1 text-xs text-destructive">{processoForm.formState.errors.numero.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tribunal *</label>
              <input {...processoForm.register('tribunal', { required: 'Obrigatório' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="TJSP" />
              {processoForm.formState.errors.tribunal && <p className="mt-1 text-xs text-destructive">{processoForm.formState.errors.tribunal.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Vara</label>
              <input {...processoForm.register('vara')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="1ª Vara Cível" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Comarca</label>
              <input {...processoForm.register('comarca')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="São Paulo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Área do Direito *</label>
              <select {...processoForm.register('area', { required: 'Obrigatório' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option value="">Selecione...</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {processoForm.formState.errors.area && <p className="mt-1 text-xs text-destructive">{processoForm.formState.errors.area.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Valor da Causa (R$)</label>
              <input {...processoForm.register('valorCausa')} type="number" step="0.01" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="0.00" />
            </div>
          </div>
          {editingProcesso && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <select {...processoForm.register('status')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">Cliente *</label>
              {!editingProcesso && (
                <button
                  type="button"
                  onClick={openNewClient}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                  Cadastrar novo cliente
                </button>
              )}
            </div>
            <select {...processoForm.register('clienteId', { required: 'Selecione um cliente' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
              <option value="">Selecione o cliente...</option>
              {clientesData?.data?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.user?.name} - {c.cpfCnpj || c.user?.email}</option>
              ))}
            </select>
            {processoForm.formState.errors.clienteId && <p className="mt-1 text-xs text-destructive">{processoForm.formState.errors.clienteId.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Descrição</label>
            <textarea {...processoForm.register('descricao')} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Descrição do processo..." />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Advogado Responsável {isAdmin ? '*' : ''}</label>
            {isAdmin ? (
              <select {...processoForm.register('advogadoId')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option value="">Selecione o advogado...</option>
                {(Array.isArray(advogados) ? advogados : []).filter((a: any) => a.isActive).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}{a.oabNumber ? ` - OAB ${a.oabNumber}/${a.oabState}` : ''}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                {user?.email} (você)
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={closeForm} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={activeMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {activeMutation.isPending ? 'Salvando...' : editingProcesso ? 'Salvar Alterações' : 'Salvar Processo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Concluir Processo */}
      <Modal open={!!showConcluir} onClose={() => setShowConcluir(null)} title="Concluir Processo">
        <form onSubmit={concluirForm.handleSubmit(onSubmitConcluir)} className="space-y-4">
          {concluirMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(concluirMutation.error as Error).message}</div>
          )}

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{showConcluir?.numero}</p>
            <p className="text-xs text-muted-foreground">{showConcluir?.area} - {showConcluir?.cliente?.user?.name}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Resultado do Processo *</label>
            <select {...concluirForm.register('resultado', { required: 'Selecione o resultado' })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20">
              <option value="">Selecione...</option>
              {RESULTADOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {concluirForm.formState.errors.resultado && <p className="mt-1 text-xs text-destructive">{concluirForm.formState.errors.resultado.message}</p>}
          </div>

          {showValorFields && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">Gerar conta a receber automaticamente (opcional)</p>
                <p className="text-xs text-muted-foreground">Preencha os campos abaixo para gerar um lançamento de honorários pendente.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Valor a Receber (R$)</label>
                  <input {...concluirForm.register('valorReceber')} type="number" step="0.01" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="0.00" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Data Prevista Pagamento</label>
                  <input {...concluirForm.register('dataPrevistaPagamento')} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-xs font-medium text-warning">Atenção</p>
            <p className="text-xs text-muted-foreground">
              Ao concluir, todos os prazos pendentes serão cancelados e as tarefas em andamento serão encerradas.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowConcluir(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={concluirMutation.isPending} className="rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-success/90 disabled:opacity-50">
              {concluirMutation.isPending ? 'Concluindo...' : 'Confirmar Conclusão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Novo Cliente */}
      <Modal open={showNewClient} onClose={() => setShowNewClient(false)} title="Cadastrar Novo Cliente" className="max-w-2xl">
        <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-4">
          {clientMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(clientMutation.error as Error).message}</div>
          )}
          {clientMutation.isSuccess && (
            <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">Cliente cadastrado! Ele já está selecionado no processo.</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome *</label>
              <input {...clientForm.register('name')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Nome completo" />
              {clientForm.formState.errors.name && <p className="mt-1 text-xs text-destructive">{clientForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email *</label>
              <input {...clientForm.register('email')} type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="email@exemplo.com" />
              {clientForm.formState.errors.email && <p className="mt-1 text-xs text-destructive">{clientForm.formState.errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Telefone</label>
              <input {...clientForm.register('phone')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="+5511999999999" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CPF/CNPJ</label>
              <input {...clientForm.register('cpfCnpj')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="123.456.789-00" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Cidade</label>
              <input {...clientForm.register('city')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">UF</label>
              <input {...clientForm.register('state')} maxLength={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="SP" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CEP</label>
              <input {...clientForm.register('zipCode')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="01234-567" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input {...clientForm.register('consentLgpd')} type="checkbox" id="lgpd-inline" className="rounded border-border" />
            <label htmlFor="lgpd-inline" className="text-sm text-muted-foreground">Consentimento LGPD</label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowNewClient(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={clientMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {clientMutation.isPending ? 'Salvando...' : 'Salvar e Selecionar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
