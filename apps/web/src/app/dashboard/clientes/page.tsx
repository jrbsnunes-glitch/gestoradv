'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientSchema, type CreateClientInput } from '@gestor-adv/validators';
import { z } from 'zod';
type ClientFormInput = z.input<typeof createClientSchema>;
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { Modal } from '@/components/ui/modal';

const ROLES_CAN_EDIT = ['ADMIN', 'ADVOGADO'];
const ROLES_CAN_DELETE = ['ADMIN'];
const ROLES_CAN_VIEW_PROCESSOS = ['ADMIN', 'ADVOGADO', 'ESTAGIARIO'];

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [viewingProcessos, setViewingProcessos] = useState<{ clientId: string; clientName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role || '';

  const canEdit = ROLES_CAN_EDIT.includes(userRole);
  const canDelete = ROLES_CAN_DELETE.includes(userRole);
  const canViewProcessos = ROLES_CAN_VIEW_PROCESSOS.includes(userRole);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get<any>('/clients'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClientInput) => api.post('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
      setEditingClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
      setConfirmDelete(null);
    },
  });

  const { data: clientDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['cliente-detail', viewingClient?.id],
    queryFn: () => api.get<any>(`/clients/${viewingClient.id}`),
    enabled: !!viewingClient,
  });

  const { data: clientProcessos, isLoading: isLoadingProcessos } = useQuery({
    queryKey: ['cliente-processos', viewingProcessos?.clientId],
    queryFn: () => api.get<any>(`/clients/${viewingProcessos!.clientId}/processos`),
    enabled: !!viewingProcessos,
  });

  const createForm = useForm<ClientFormInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { consentLgpd: true },
  });

  const editForm = useForm<any>();

  const openCreate = () => {
    createForm.reset({ consentLgpd: true });
    createMutation.reset();
    setShowForm(true);
  };

  const openEdit = (client: any) => {
    editForm.reset({
      name: client.user?.name || '',
      email: client.user?.email || '',
      phone: client.user?.phone || '',
      cpfCnpj: client.cpfCnpj || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      notes: client.notes || '',
    });
    updateMutation.reset();
    setEditingClient(client);
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro e gestão de clientes do escritório</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90">
          Novo Cliente
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Telefone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CPF/CNPJ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            ) : !data?.data?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado</td></tr>
            ) : (
              data.data.map((c: any) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{c.user?.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.user?.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.user?.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.cpfCnpj || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingClient(c)}
                        title="Visualizar"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                          </svg>
                        </button>
                      )}
                      {canViewProcessos && (
                        <button
                          onClick={() => setViewingProcessos({ clientId: c.id, clientName: c.user?.name })}
                          title="Ver processos"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-info/10 hover:text-info transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(c)}
                          title="Excluir"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Cliente */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Cliente" className="max-w-2xl">
        <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data as CreateClientInput))} className="space-y-4">
          {createMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(createMutation.error as Error).message}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome *</label>
              <input {...createForm.register('name')} className={inputClass} placeholder="Nome completo" />
              {createForm.formState.errors.name && <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email *</label>
              <input {...createForm.register('email')} type="email" className={inputClass} placeholder="email@exemplo.com" />
              {createForm.formState.errors.email && <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Telefone</label>
              <input {...createForm.register('phone')} className={inputClass} placeholder="+5511999999999" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CPF/CNPJ</label>
              <input {...createForm.register('cpfCnpj')} className={inputClass} placeholder="123.456.789-00" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Cidade</label>
              <input {...createForm.register('city')} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">UF</label>
              <input {...createForm.register('state')} maxLength={2} className={inputClass} placeholder="SP" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CEP</label>
              <input {...createForm.register('zipCode')} className={inputClass} placeholder="01234-567" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Observações</label>
            <textarea {...createForm.register('notes')} rows={2} className={inputClass} />
          </div>
          <div className="flex items-center gap-2">
            <input {...createForm.register('consentLgpd')} type="checkbox" id="lgpd-create" className="rounded border-border" />
            <label htmlFor="lgpd-create" className="text-sm text-muted-foreground">Consentimento LGPD para tratamento de dados</label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Visualizar Cliente */}
      <Modal open={!!viewingClient} onClose={() => setViewingClient(null)} title="Detalhes do Cliente" className="max-w-lg">
        {isLoadingDetail ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : clientDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium text-foreground">{clientDetail.user?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium text-foreground">{clientDetail.user?.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>
                <p className="font-medium text-foreground">{clientDetail.user?.phone || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CPF/CNPJ:</span>
                <p className="font-medium text-foreground">{clientDetail.cpfCnpj || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cidade/UF:</span>
                <p className="font-medium text-foreground">{clientDetail.city ? `${clientDetail.city}/${clientDetail.state}` : '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CEP:</span>
                <p className="font-medium text-foreground">{clientDetail.zipCode || '-'}</p>
              </div>
            </div>
            {clientDetail.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Observações:</span>
                <p className="mt-1 text-foreground">{clientDetail.notes}</p>
              </div>
            )}
            {clientDetail.processos?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Processos ({clientDetail.processos.length}):</p>
                <div className="space-y-1">
                  {clientDetail.processos.map((p: any) => (
                    <Link key={p.id} href={`/dashboard/processos/${p.id}`} className="block rounded-lg bg-muted/50 px-3 py-2 text-sm text-primary hover:underline">
                      {p.numero} - {p.area} ({p.status})
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end border-t border-border pt-4">
              <button onClick={() => setViewingClient(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Fechar</button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal open={!!editingClient} onClose={() => setEditingClient(null)} title="Editar Cliente" className="max-w-2xl">
        <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: editingClient?.id, data }))} className="space-y-4">
          {updateMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(updateMutation.error as Error).message}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <input {...editForm.register('name')} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input {...editForm.register('email')} type="email" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Telefone</label>
              <input {...editForm.register('phone')} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CPF/CNPJ</label>
              <input {...editForm.register('cpfCnpj')} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Cidade</label>
              <input {...editForm.register('city')} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">UF</label>
              <input {...editForm.register('state')} maxLength={2} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CEP</label>
              <input {...editForm.register('zipCode')} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Observações</label>
            <textarea {...editForm.register('notes')} rows={2} className={inputClass} />
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setEditingClient(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Processos do Cliente */}
      <Modal open={!!viewingProcessos} onClose={() => setViewingProcessos(null)} title={`Processos de ${viewingProcessos?.clientName || ''}`} className="max-w-2xl">
        {isLoadingProcessos ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !clientProcessos?.length ? (
          <p className="text-sm text-muted-foreground">Este cliente não possui processos.</p>
        ) : (
          <div className="space-y-3">
            {clientProcessos.map((p: any) => (
              <Link key={p.id} href={`/dashboard/processos/${p.id}`} className="block rounded-lg border border-border p-4 transition hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">{p.numero}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.area} | Adv: {p.advogado?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{p.status}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{p._count?.prazos ?? 0} prazo(s)</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button onClick={() => setViewingProcessos(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Fechar</button>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar Exclusão">
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Tem certeza que deseja excluir o cliente <strong>{confirmDelete?.user?.name}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta ação irá desativar o usuário associado. Processos vinculados não serão excluídos.
          </p>
          {deleteMutation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(deleteMutation.error as Error).message}</div>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button
              onClick={() => deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
