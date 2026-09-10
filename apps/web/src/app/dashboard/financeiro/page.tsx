'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

type FinTab = 'receitas' | 'saidas' | 'caixa';

function localDate(d?: Date): string {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ==================== LABELS ====================
const RECEITA_TIPOS: Record<string, string> = { HONORARIO: 'Honorário', ACORDO: 'Acordo', REEMBOLSO: 'Reembolso', OUTRO: 'Outros' };
const SAIDA_TIPOS: Record<string, string> = { CUSTAS: 'Custas', DESPESA: 'Despesa', OUTRO: 'Outros' };
const TODOS_TIPOS: Record<string, string> = { ...RECEITA_TIPOS, ...SAIDA_TIPOS };
const STATUS_LABELS: Record<string, string> = { PENDENTE: 'Pendente', PAGO: 'Pago', CANCELADO: 'Cancelado', VENCIDO: 'Vencido' };
const STATUS_COLORS: Record<string, string> = { PENDENTE: 'bg-warning/10 text-warning', PAGO: 'bg-success/10 text-success', CANCELADO: 'bg-muted text-muted-foreground', VENCIDO: 'bg-destructive/10 text-destructive' };
const CATEGORIA_LABELS: Record<string, string> = {
  ALUGUEL: 'Aluguel', CONDOMINIO: 'Condomínio', ENERGIA: 'Energia', AGUA: 'Água',
  INTERNET: 'Internet', TELEFONE: 'Telefone', MATERIAL_ESCRITORIO: 'Material Escritório',
  SOFTWARE: 'Software', CONTABILIDADE: 'Contabilidade', SALARIOS: 'Salários',
  IMPOSTOS: 'Impostos', SEGURO: 'Seguro', MANUTENCAO: 'Manutenção',
  MARKETING: 'Marketing', TRANSPORTE: 'Transporte', ALIMENTACAO: 'Alimentação', OUTROS: 'Outros',
};
const RECORRENCIA_LABELS: Record<string, string> = { UNICA: 'Única', MENSAL: 'Mensal', BIMESTRAL: 'Bimestral', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20';

const R$ = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function printArea(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222;font-size:12px}
    h1{font-size:18px;margin-bottom:4px} h2{font-size:14px;color:#666;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
    th{background:#f5f5f5;font-weight:600;font-size:11px;text-transform:uppercase;color:#666}
    .text-right{text-align:right} .text-success{color:#16a34a} .text-destructive{color:#dc2626}
    .text-warning{color:#d97706} .summary{display:flex;gap:24px;margin-bottom:16px}
    .summary-card{border:1px solid #ddd;border-radius:6px;padding:12px 16px;min-width:140px}
    .summary-card .label{font-size:11px;color:#888} .summary-card .value{font-size:18px;font-weight:700;margin-top:2px}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
    .footer{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#999;text-align:center}
    @media print{body{padding:12px} .no-print{display:none!important}}
  </style></head><body>`);
  win.document.write(el.innerHTML);
  win.document.write(`<div class="footer">GestorAdv — Gerado em ${new Date().toLocaleString('pt-BR')}</div>`);
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function FinanceiroPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FinTab>('receitas');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [filterAdvogadoId, setFilterAdvogadoId] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'receitas' || tab === 'saidas' || tab === 'caixa') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const { data: advogados = [] } = useQuery<any[]>({
    queryKey: ['advogados'],
    queryFn: () => api.get('/users/advogados'),
    enabled: isAdmin,
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entradas, saídas e caixa do escritório</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Advogado:</label>
            <select
              value={filterAdvogadoId}
              onChange={e => setFilterAdvogadoId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Todos</option>
              {advogados.filter((a: any) => a.isActive).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {([
          { key: 'receitas' as FinTab, label: 'Entradas (Receitas)', icon: '↑' },
          { key: 'saidas' as FinTab, label: 'Saídas (Despesas)', icon: '↓' },
          { key: 'caixa' as FinTab, label: 'Caixa', icon: '≡' },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn(
            'flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition',
            activeTab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}>
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'receitas' && <ReceitasSection advogadoId={filterAdvogadoId} />}
      {activeTab === 'saidas' && <SaidasSection advogadoId={filterAdvogadoId} />}
      {activeTab === 'caixa' && <CaixaSection advogadoId={filterAdvogadoId} />}
    </div>
  );
}

// ==================== ENTRADAS (RECEITAS) ====================
function ReceitasSection({ advogadoId }: { advogadoId?: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = ['ADMIN', 'ADVOGADO'].includes(user?.role || '');
  const isAdmin = user?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ tipo: 'HONORARIO' });

  const { data, isLoading } = useQuery({
    queryKey: ['fin-receitas', page, filterStatus, advogadoId],
    queryFn: async () => {
      const all = await api.get<any>(`/financeiro?page=1&limit=200${filterStatus ? `&status=${filterStatus}` : ''}${advogadoId ? `&advogadoId=${advogadoId}` : ''}`);
      const filtered = (all.data || []).filter((l: any) => Object.keys(RECEITA_TIPOS).includes(l.tipo));
      const start = (page - 1) * 20;
      return { data: filtered.slice(start, start + 20), meta: { total: filtered.length, page, limit: 20, totalPages: Math.ceil(filtered.length / 20) } };
    },
  });

  const { data: clientesData } = useQuery({ queryKey: ['clientes-list'], queryFn: () => api.get<any>('/clients?limit=200') });
  const { data: processosData } = useQuery({ queryKey: ['processos-list'], queryFn: () => api.get<any>('/processos?limit=200') });

  const invalidateAll = () => { queryClient.invalidateQueries({ queryKey: ['fin-receitas'] }); queryClient.invalidateQueries({ queryKey: ['fin-caixa'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-completo'] }); };
  const createMut = useMutation({ mutationFn: (d: any) => api.post('/financeiro', d), onSuccess: () => { invalidateAll(); setShowForm(false); setForm({ tipo: 'HONORARIO' }); } });
  const pagoMut = useMutation({ mutationFn: ({ id }: { id: string }) => api.patch(`/financeiro/${id}/pago`, {}), onSuccess: invalidateAll });
  const cancelMut = useMutation({ mutationFn: (id: string) => api.patch(`/financeiro/${id}/cancelar`, {}), onSuccess: invalidateAll });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {canEdit && <button onClick={() => setShowForm(true)} className="rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-success/90">Nova Receita</button>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-success/5">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processo</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            : !data?.data?.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhuma receita</td></tr>
            : data.data.map((l: any) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{l.descricao}</td>
                <td className="px-4 py-3 text-muted-foreground">{RECEITA_TIPOS[l.tipo] || l.tipo}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.cliente?.user?.name || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.processo?.numero || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-success">{R$(Number(l.valor))}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.dataVencimento ? new Date(l.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                  {l.status === 'PENDENTE' && canEdit && <button onClick={() => pagoMut.mutate({ id: l.id })} className="rounded-md px-2 py-1 text-xs font-medium text-success hover:bg-success/10">Receber</button>}
                  {l.status === 'PENDENTE' && isAdmin && <button onClick={() => cancelMut.mutate(l.id)} className="rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10">Cancelar</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setForm({ tipo: 'HONORARIO' }); }} title="Nova Receita" className="max-w-2xl">
        <form onSubmit={e => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Descrição *</label><input required value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Tipo *</label><select required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputClass}>{Object.entries(RECEITA_TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Valor (R$) *</label><input required type="number" step="0.01" min="0" value={form.valor || ''} onChange={e => setForm({ ...form, valor: parseFloat(e.target.value) })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Vencimento</label><input type="date" value={form.dataVencimento || ''} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Cliente</label><select value={form.clienteId || ''} onChange={e => setForm({ ...form, clienteId: e.target.value || undefined })} className={inputClass}><option value="">-</option>{clientesData?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.user?.name}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Processo</label><select value={form.processoId || ''} onChange={e => setForm({ ...form, processoId: e.target.value || undefined })} className={inputClass}><option value="">-</option>{processosData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium">Observações</label><textarea rows={2} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} className={inputClass} /></div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isPending} className="rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-success/90 disabled:opacity-50">{createMut.isPending ? 'Salvando...' : 'Salvar Receita'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ==================== SAÍDAS (DESPESAS + CONTAS A PAGAR) ====================
function SaidasSection({ advogadoId }: { advogadoId?: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = ['ADMIN', 'ADVOGADO'].includes(user?.role || '');
  const isAdmin = user?.role === 'ADMIN';
  const [subTab, setSubTab] = useState<'despesas' | 'contas'>('despesas');
  const [page, setPage] = useState(1);
  const [showFormDesp, setShowFormDesp] = useState(false);
  const [showFormConta, setShowFormConta] = useState(false);
  const [formD, setFormD] = useState<any>({ tipo: 'DESPESA' });
  const [formC, setFormC] = useState<any>({ recorrencia: 'UNICA', contaFixa: false });

  const despesasQuery = useQuery({
    queryKey: ['fin-despesas', page, advogadoId],
    queryFn: async () => {
      const all = await api.get<any>(`/financeiro?page=1&limit=200${advogadoId ? `&advogadoId=${advogadoId}` : ''}`);
      const filtered = (all.data || []).filter((l: any) => !['HONORARIO', 'ACORDO', 'REEMBOLSO'].includes(l.tipo));
      const start = (page - 1) * 20;
      return { data: filtered.slice(start, start + 20), meta: { total: filtered.length, page, limit: 20, totalPages: Math.ceil(filtered.length / 20) } };
    },
    enabled: subTab === 'despesas',
  });

  const contasQuery = useQuery({
    queryKey: ['fin-contas', page],
    queryFn: () => api.get<any>(`/contas-pagar?page=${page}&limit=20`),
    enabled: subTab === 'contas',
  });

  const { data: processosData } = useQuery({ queryKey: ['processos-list'], queryFn: () => api.get<any>('/processos?limit=200') });

  const invalidateAll = () => { queryClient.invalidateQueries({ queryKey: ['fin-despesas'] }); queryClient.invalidateQueries({ queryKey: ['fin-contas'] }); queryClient.invalidateQueries({ queryKey: ['fin-caixa'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-completo'] }); };
  const createDespMut = useMutation({ mutationFn: (d: any) => api.post('/financeiro', d), onSuccess: () => { invalidateAll(); setShowFormDesp(false); setFormD({ tipo: 'DESPESA' }); } });
  const createContaMut = useMutation({ mutationFn: (d: any) => api.post('/contas-pagar', d), onSuccess: () => { invalidateAll(); setShowFormConta(false); setFormC({ recorrencia: 'UNICA', contaFixa: false }); } });
  const pagoLancMut = useMutation({ mutationFn: (id: string) => api.patch(`/financeiro/${id}/pago`, {}), onSuccess: invalidateAll });
  const pagoContaMut = useMutation({ mutationFn: (id: string) => api.patch(`/contas-pagar/${id}/pago`, {}), onSuccess: invalidateAll });
  const gerarRecMut = useMutation({ mutationFn: () => api.post('/contas-pagar/gerar-recorrentes', {}), onSuccess: invalidateAll });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          <button onClick={() => { setSubTab('despesas'); setPage(1); }} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', subTab === 'despesas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>Custas/Despesas</button>
          <button onClick={() => { setSubTab('contas'); setPage(1); }} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', subTab === 'contas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>Contas a Pagar</button>
        </div>
        <div className="flex gap-2">
          {subTab === 'contas' && isAdmin && <button onClick={() => gerarRecMut.mutate()} disabled={gerarRecMut.isPending} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">{gerarRecMut.isPending ? 'Gerando...' : 'Gerar Recorrentes'}</button>}
          {canEdit && subTab === 'despesas' && <button onClick={() => setShowFormDesp(true)} className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-destructive/90">Nova Despesa</button>}
          {canEdit && subTab === 'contas' && <button onClick={() => setShowFormConta(true)} className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-destructive/90">Nova Conta</button>}
        </div>
      </div>

      {subTab === 'despesas' && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-destructive/5">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processo</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr></thead>
            <tbody>
              {despesasQuery.isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              : !despesasQuery.data?.data?.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma despesa</td></tr>
              : despesasQuery.data.data.map((l: any) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{l.descricao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{SAIDA_TIPOS[l.tipo] || l.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.processo?.numero || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-destructive">{R$(Number(l.valor))}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.dataVencimento ? new Date(l.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    {l.status === 'PENDENTE' && canEdit && <button onClick={() => pagoLancMut.mutate(l.id)} className="rounded-md px-2 py-1 text-xs font-medium text-success hover:bg-success/10">Pagar</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'contas' && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-destructive/5">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fornecedor</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr></thead>
            <tbody>
              {contasQuery.isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              : !contasQuery.data?.data?.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma conta</td></tr>
              : contasQuery.data.data.map((c: any) => {
                const vencida = c.status === 'PENDENTE' && new Date(c.dataVencimento) < new Date();
                return (
                  <tr key={c.id} className={cn('border-b border-border last:border-0 hover:bg-muted/20', vencida && 'bg-destructive/5')}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{c.descricao}</span>
                      {c.contaFixa && <span className="ml-1.5 rounded bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold text-info">FIXA</span>}
                      {c.recorrencia !== 'UNICA' && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{RECORRENCIA_LABELS[c.recorrencia]}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{CATEGORIA_LABELS[c.categoria] || c.categoria}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.fornecedor || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">{R$(Number(c.valor))}</td>
                    <td className="px-4 py-3"><span className={cn('text-muted-foreground', vencida && 'font-medium text-destructive')}>{new Date(c.dataVencimento).toLocaleDateString('pt-BR')}</span>{vencida && <span className="ml-1 text-[10px] text-destructive">VENCIDA</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      {c.status === 'PENDENTE' && canEdit && <button onClick={() => pagoContaMut.mutate(c.id)} className="rounded-md px-2 py-1 text-xs font-medium text-success hover:bg-success/10">Pagar</button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Despesa */}
      <Modal open={showFormDesp} onClose={() => setShowFormDesp(false)} title="Nova Despesa" className="max-w-lg">
        <form onSubmit={e => { e.preventDefault(); createDespMut.mutate(formD); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Descrição *</label><input required value={formD.descricao || ''} onChange={e => setFormD({ ...formD, descricao: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Tipo *</label><select required value={formD.tipo} onChange={e => setFormD({ ...formD, tipo: e.target.value })} className={inputClass}>{Object.entries(SAIDA_TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Valor (R$) *</label><input required type="number" step="0.01" min="0" value={formD.valor || ''} onChange={e => setFormD({ ...formD, valor: parseFloat(e.target.value) })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Vencimento</label><input type="date" value={formD.dataVencimento || ''} onChange={e => setFormD({ ...formD, dataVencimento: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Processo</label><select value={formD.processoId || ''} onChange={e => setFormD({ ...formD, processoId: e.target.value || undefined })} className={inputClass}><option value="">-</option>{processosData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowFormDesp(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={createDespMut.isPending} className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">{createDespMut.isPending ? 'Salvando...' : 'Salvar Despesa'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nova Conta */}
      <Modal open={showFormConta} onClose={() => setShowFormConta(false)} title="Nova Conta a Pagar" className="max-w-2xl">
        <form onSubmit={e => { e.preventDefault(); createContaMut.mutate(formC); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Descrição *</label><input required value={formC.descricao || ''} onChange={e => setFormC({ ...formC, descricao: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Categoria *</label><select required value={formC.categoria || ''} onChange={e => setFormC({ ...formC, categoria: e.target.value })} className={inputClass}><option value="">Selecione</option>{Object.entries(CATEGORIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Valor (R$) *</label><input required type="number" step="0.01" min="0" value={formC.valor || ''} onChange={e => setFormC({ ...formC, valor: parseFloat(e.target.value) })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Vencimento *</label><input required type="date" value={formC.dataVencimento || ''} onChange={e => setFormC({ ...formC, dataVencimento: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Fornecedor</label><input value={formC.fornecedor || ''} onChange={e => setFormC({ ...formC, fornecedor: e.target.value })} className={inputClass} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Recorrência</label><select value={formC.recorrencia} onChange={e => setFormC({ ...formC, recorrencia: e.target.value })} className={inputClass}>{Object.entries(RECORRENCIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="flex items-end"><label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/30"><input type="checkbox" checked={formC.contaFixa || false} onChange={e => setFormC({ ...formC, contaFixa: e.target.checked })} className="h-4 w-4" /><span className="font-medium">Conta fixa</span></label></div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setShowFormConta(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={createContaMut.isPending} className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50">{createContaMut.isPending ? 'Salvando...' : 'Salvar Conta'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ==================== CAIXA ====================
function CaixaSection({ advogadoId }: { advogadoId?: string }) {
  const hoje = localDate();
  const mesInicio = firstDayOfMonth();
  const [filterMode, setFilterMode] = useState<'dia' | 'periodo'>('periodo');
  const [dataDia, setDataDia] = useState(hoje);
  const [dataDe, setDataDe] = useState(mesInicio);
  const [dataAte, setDataAte] = useState(hoje);

  const de = filterMode === 'dia' ? dataDia : dataDe;
  const ate = filterMode === 'dia' ? dataDia : dataAte;

  const { data, isLoading, error } = useQuery({
    queryKey: ['fin-caixa', de, ate, advogadoId],
    queryFn: () => api.get<any>(`/financeiro/caixa?de=${de}&ate=${ate}${advogadoId ? `&advogadoId=${advogadoId}` : ''}`),
  });

  const periodoLabel = filterMode === 'dia'
    ? new Date(dataDia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${new Date(dataDe + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataAte + 'T12:00:00').toLocaleDateString('pt-BR')}`;

  return (
    <>
      {/* Filtro */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          <button onClick={() => setFilterMode('dia')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', filterMode === 'dia' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>Dia</button>
          <button onClick={() => setFilterMode('periodo')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', filterMode === 'periodo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>Período</button>
        </div>
        {filterMode === 'dia' ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Data</label>
            <input type="date" value={dataDia} onChange={e => setDataDia(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        ) : (
          <>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">De</label><input type="date" value={dataDe} onChange={e => setDataDe(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Até</label><input type="date" value={dataAte} onChange={e => setDataAte(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
          </>
        )}
        <button onClick={() => { setDataDia(localDate()); setDataDe(firstDayOfMonth()); setDataAte(localDate()); }} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">Hoje</button>
        <button onClick={() => printArea('caixa-print', `Caixa - ${periodoLabel}`)} className="ml-auto rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
          Imprimir / PDF
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Erro ao carregar caixa: {(error as Error).message}</div>}

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !data ? null : (
        <div id="caixa-print">
          <h1 style={{ display: 'none' }} className="print-only">Caixa — GestorAdv</h1>
          <h2 style={{ display: 'none' }} className="print-only">{periodoLabel}</h2>

          {/* Resumo */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <p className="text-xs font-medium text-muted-foreground">Total Entradas</p>
              <p className="mt-2 text-2xl font-bold text-success">{R$(data.totalEntradas)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.entradas.length} lançamento(s)</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <p className="text-xs font-medium text-muted-foreground">Total Saídas</p>
              <p className="mt-2 text-2xl font-bold text-destructive">{R$(data.totalSaidas)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.saidas.length} lançamento(s)</p>
            </div>
            <div className={cn('rounded-xl border p-5', data.saldo >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
              <p className="text-xs font-medium text-muted-foreground">Saldo</p>
              <p className={cn('mt-2 text-2xl font-bold', data.saldo >= 0 ? 'text-success' : 'text-destructive')}>{R$(data.saldo)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.totalMovimentacoes} movimentação(ões)</p>
            </div>
          </div>

          {data.split && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-5">
                  <p className="text-xs font-medium text-muted-foreground">Total Receitas (honorários)</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{R$(data.split.totalReceitas)}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30 p-5">
                  <p className="text-xs font-medium text-muted-foreground">Parte Escritório</p>
                  <p className="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-400">{R$(data.split.valorEscritorio)}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30 p-5">
                  <p className="text-xs font-medium text-muted-foreground">Parte Advogados</p>
                  <p className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-400">{R$(data.split.valorAdvogado)}</p>
                </div>
              </div>
              {data.split.porAdvogado?.length > 0 && (
                <div className="mb-6 overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Advogado</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Receitas</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">% Escritório</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Escritório</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Advogado</th>
                    </tr></thead>
                    <tbody>
                      {data.split.porAdvogado.map((a: any) => (
                        <tr key={a.nome} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-medium text-foreground">{a.nome}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{R$(a.receitas)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{a.percentual}%</td>
                          <td className="px-4 py-2.5 text-right font-medium text-indigo-700 dark:text-indigo-400">{R$(a.escritorio)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-purple-700 dark:text-purple-400">{R$(a.advogado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Entradas */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-xs text-success">↑</span>
              Entradas
            </h3>
            {data.entradas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma entrada no período.</p> : (
              <div className="overflow-x-auto rounded-xl border border-success/20 bg-card">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-success/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pagamento</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                  </tr></thead>
                  <tbody>
                    {data.entradas.map((e: any) => (
                      <tr key={e.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{e.descricao}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{TODOS_TIPOS[e.tipo] || e.tipo}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.cliente || '-'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.formaPagamento || '-'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.data ? new Date(e.data).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-success">{R$(e.valor)}</td>
                      </tr>
                    ))}
                    <tr className="bg-success/5 font-semibold">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-foreground">Total Entradas</td>
                      <td className="px-4 py-2.5 text-right text-success">{R$(data.totalEntradas)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Saídas */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs text-destructive">↓</span>
              Saídas
            </h3>
            {data.saidas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma saída no período.</p> : (
              <div className="overflow-x-auto rounded-xl border border-destructive/20 bg-card">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-destructive/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo/Categoria</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Origem</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pagamento</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                  </tr></thead>
                  <tbody>
                    {data.saidas.map((s: any) => (
                      <tr key={s.id + s.fonte} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{s.descricao}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{CATEGORIA_LABELS[s.tipo] || TODOS_TIPOS[s.tipo] || s.tipo}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.fonte === 'conta_pagar' ? 'Conta' : 'Lançamento'}{s.fornecedor ? ` — ${s.fornecedor}` : ''}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.formaPagamento || '-'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.data ? new Date(s.data).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-destructive">{R$(s.valor)}</td>
                      </tr>
                    ))}
                    <tr className="bg-destructive/5 font-semibold">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-foreground">Total Saídas</td>
                      <td className="px-4 py-2.5 text-right text-destructive">{R$(data.totalSaidas)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Saldo Final */}
          <div className={cn('rounded-xl border-2 p-5 text-center', data.saldo >= 0 ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5')}>
            <p className="text-sm font-medium text-muted-foreground">Saldo Final do Período</p>
            <p className={cn('mt-1 text-3xl font-bold', data.saldo >= 0 ? 'text-success' : 'text-destructive')}>{R$(data.saldo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{periodoLabel}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function FinanceiroPage() {
  return (
    <Suspense>
      <FinanceiroPageInner />
    </Suspense>
  );
}

// ==================== COMPONENTES AUXILIARES ====================
function StatusBadge({ status }: { status: string }) {
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[status] || 'bg-muted text-muted-foreground')}>{STATUS_LABELS[status] || status}</span>;
}
