'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type ReportTab = 'processos' | 'prazos' | 'produtividade' | 'financeiro';

const AREA_LABELS: Record<string, string> = {
  TRABALHISTA: 'Trabalhista', CIVIL: 'Civil', PENAL: 'Penal', FAMILIA: 'Família',
  TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário', ADMINISTRATIVO: 'Administrativo',
  EMPRESARIAL: 'Empresarial', CONSUMIDOR: 'Consumidor', AMBIENTAL: 'Ambiental', OUTRO: 'Outro',
};

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
    .text-warning{color:#d97706}
    .summary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}
    .summary-card{border:1px solid #ddd;border-radius:6px;padding:10px 14px;min-width:120px}
    .summary-card .label{font-size:11px;color:#888} .summary-card .value{font-size:16px;font-weight:700;margin-top:2px}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
    .progress-bar{height:10px;border-radius:5px;background:#eee;margin-top:4px}
    .progress-fill{height:10px;border-radius:5px;background:#4f46e5}
    .footer{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#999;text-align:center}
    .card{border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:12px}
    @media print{body{padding:12px} .no-print{display:none!important}}
  </style></head><body>`);
  win.document.write(`<h1>${title}</h1>`);
  win.document.write(`<h2>Gerado em ${new Date().toLocaleString('pt-BR')}</h2>`);
  win.document.write(el.innerHTML);
  win.document.write('<div class="footer">GestorAdv — Sistema de Gestão para Advocacia</div>');
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const [tab, setTab] = useState<ReportTab>('processos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterAdvogadoId, setFilterAdvogadoId] = useState('');
  const [mesFin, setMesFin] = useState(new Date().toISOString().slice(0, 7));
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: advogados = [] } = useQuery<any[]>({
    queryKey: ['advogados'],
    queryFn: () => api.get('/users/advogados'),
    enabled: isAdmin,
  });

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'processos', label: 'Processos' },
    { key: 'prazos', label: 'Prazos' },
    { key: 'produtividade', label: 'Produtividade' },
    { key: 'financeiro', label: 'Financeiro' },
  ];

  const processosQuery = useQuery({
    queryKey: ['relatorio-processos', de, ate, filterStatus, filterArea, filterAdvogadoId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      if (filterStatus) params.set('status', filterStatus);
      if (filterArea) params.set('area', filterArea);
      if (filterAdvogadoId) params.set('advogadoId', filterAdvogadoId);
      return api.get<any>(`/relatorios/processos?${params}`);
    },
    enabled: tab === 'processos',
  });

  const prazosQuery = useQuery({
    queryKey: ['relatorio-prazos', de, ate, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      if (filterStatus) params.set('status', filterStatus);
      return api.get<any>(`/relatorios/prazos?${params}`);
    },
    enabled: tab === 'prazos',
  });

  const produtividadeQuery = useQuery({
    queryKey: ['relatorio-produtividade', de, ate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      return api.get<any>(`/relatorios/produtividade?${params}`);
    },
    enabled: tab === 'produtividade',
  });

  const advParam = filterAdvogadoId ? `&advogadoId=${filterAdvogadoId}` : '';

  const financeiroQuery = useQuery({
    queryKey: ['relatorio-financeiro', mesFin, filterAdvogadoId],
    queryFn: () => api.get<any>(`/financeiro/resumo-mensal?mes=${mesFin}${advParam}`),
    enabled: tab === 'financeiro',
  });

  const finAnualQuery = useQuery({
    queryKey: ['relatorio-financeiro-anual', mesFin.slice(0, 4), filterAdvogadoId],
    queryFn: () => api.get<any>(`/financeiro/resumo-anual?ano=${mesFin.slice(0, 4)}${advParam}`),
    enabled: tab === 'financeiro',
  });

  function exportProcessos() {
    const d = processosQuery.data;
    if (!d?.processos) return;
    exportCSV(
      ['Número', 'Área', 'Status', 'Advogado', 'Cliente', 'Valor da Causa', 'Data Criação'],
      d.processos.map((p: any) => [p.numero, AREA_LABELS[p.area] || p.area, p.status, p.advogado?.name || '', p.cliente?.user?.name || '', p.valorCausa ? Number(p.valorCausa).toFixed(2) : '', new Date(p.createdAt).toLocaleDateString('pt-BR')]),
      `relatorio-processos-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  function exportPrazos() {
    const d = prazosQuery.data;
    if (!d?.prazos) return;
    exportCSV(
      ['Descrição', 'Processo', 'Status', 'Urgência', 'Data Limite', 'Advogado'],
      d.prazos.map((p: any) => [p.descricao, p.processo?.numero || '', p.status, p.urgencia, new Date(p.dataLimite).toLocaleDateString('pt-BR'), p.processo?.advogado?.name || '']),
      `relatorio-prazos-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  function exportProdutividade() {
    const d = produtividadeQuery.data;
    if (!d) return;
    exportCSV(
      ['Advogado', 'Processos Total', 'Processos Ativos', 'Tarefas Total', 'Concluídas', 'Pendentes', 'Taxa Conclusão (%)'],
      d.map((a: any) => [a.nome, a.processosTotal, a.processosAtivos, a.tarefasTotal, a.tarefasConcluidas, a.tarefasPendentes, a.taxaConclusao]),
      `relatorio-produtividade-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  const printTitle = {
    processos: 'Relatório de Processos',
    prazos: 'Relatório de Prazos',
    produtividade: 'Relatório de Produtividade',
    financeiro: `Relatório Financeiro — ${mesFin}`,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Análise de processos, prazos, produtividade e financeiro</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition',
            tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {tab !== 'financeiro' && (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">De</label><input type="date" value={de} onChange={e => setDe(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Até</label><input type="date" value={ate} onChange={e => setAte(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
          {tab === 'processos' && (
            <>
              <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="SUSPENSO">Suspenso</option><option value="ENCERRADO">Encerrado</option><option value="ARQUIVADO">Arquivado</option></select></div>
              <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Área</label><select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Todas</option>{Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </>
          )}
          {tab === 'prazos' && (
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="CUMPRIDO">Cumprido</option><option value="PERDIDO">Perdido</option></select></div>
          )}
          {isAdmin && (tab === 'processos' || tab === 'produtividade') && (
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Advogado</label><select value={filterAdvogadoId} onChange={e => setFilterAdvogadoId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Todos</option>{advogados.filter((a: any) => a.isActive).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          )}
          <button onClick={() => { setDe(''); setAte(''); setFilterStatus(''); setFilterArea(''); setFilterAdvogadoId(''); }} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">Limpar</button>
        </div>
      )}

      {tab === 'financeiro' && isAdmin && (
        <div className="mb-4 flex items-end gap-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Advogado</label><select value={filterAdvogadoId} onChange={e => setFilterAdvogadoId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Todos</option>{advogados.filter((a: any) => a.isActive).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        </div>
      )}

      {/* Ações de impressão/export */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <button onClick={() => printArea(`report-${tab}`, printTitle[tab])} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
          Imprimir / PDF
        </button>
        {tab !== 'financeiro' && (
          <button onClick={() => { if (tab === 'processos') exportProcessos(); else if (tab === 'prazos') exportPrazos(); else if (tab === 'produtividade') exportProdutividade(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
            Exportar CSV
          </button>
        )}
      </div>

      {/* ========== PROCESSOS ========== */}
      {tab === 'processos' && (
        <div id="report-processos">
          {processosQuery.data && (
            <>
              <div className="summary mb-4 flex flex-wrap gap-4">
                <SummaryCard label="Total" value={processosQuery.data.total} />
                <SummaryCard label="Valor Total" value={R$(processosQuery.data.valorTotal)} />
                {Object.entries(processosQuery.data.porStatus).map(([k, v]) => <SummaryCard key={k} label={k} value={v as number} />)}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Área</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Advogado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Prazos</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Movim.</th>
                  </tr></thead>
                  <tbody>
                    {processosQuery.data.processos.map((p: any) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">{p.numero}</td>
                        <td className="px-4 py-3 text-muted-foreground">{AREA_LABELS[p.area] || p.area}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{p.advogado?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.cliente?.user?.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p._count?.prazos || 0}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p._count?.movimentacoes || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== PRAZOS ========== */}
      {tab === 'prazos' && (
        <div id="report-prazos">
          {prazosQuery.data && (
            <>
              <div className="summary mb-4 flex flex-wrap gap-4">
                <SummaryCard label="Total" value={prazosQuery.data.total} />
                <SummaryCard label="Vencidos" value={prazosQuery.data.vencidos} danger />
                {Object.entries(prazosQuery.data.porStatus).map(([k, v]) => <SummaryCard key={k} label={k} value={v as number} />)}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Urgência</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Limite</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Advogado</th>
                  </tr></thead>
                  <tbody>
                    {prazosQuery.data.prazos.map((p: any) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">{p.descricao}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.processo?.numero}</td>
                        <td className="px-4 py-3"><UrgenciaBadge urgencia={p.urgencia} /></td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(p.dataLimite).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.processo?.advogado?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== PRODUTIVIDADE ========== */}
      {tab === 'produtividade' && (
        <div id="report-produtividade">
          {produtividadeQuery.data && (
            <div className="space-y-4">
              {produtividadeQuery.data.map((a: any) => (
                <div key={a.id} className="card rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">{a.nome}</h3>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{a.taxaConclusao}% conclusão</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    <Metric label="Processos" value={a.processosTotal} />
                    <Metric label="Proc. Ativos" value={a.processosAtivos} />
                    <Metric label="Tarefas" value={a.tarefasTotal} />
                    <Metric label="Concluídas" value={a.tarefasConcluidas} />
                    <Metric label="Pendentes" value={a.tarefasPendentes} />
                  </div>
                  <div className="progress-bar mt-3 h-2.5 rounded-full bg-muted">
                    <div className="progress-fill h-2.5 rounded-full bg-primary transition-all" style={{ width: `${a.taxaConclusao}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== FINANCEIRO ========== */}
      {tab === 'financeiro' && (
        <div id="report-financeiro">
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Mês/Ano:</label>
            <input type="month" value={mesFin} onChange={e => setMesFin(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>

          {financeiroQuery.data && (
            <div className="summary mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="summary-card rounded-lg border border-border bg-card p-4">
                <p className="label text-xs text-muted-foreground">Receitas</p>
                <p className="value mt-1 text-xl font-bold text-success">{R$(financeiroQuery.data.totalReceitas)}</p>
              </div>
              <div className="summary-card rounded-lg border border-border bg-card p-4">
                <p className="label text-xs text-muted-foreground">Despesas</p>
                <p className="value mt-1 text-xl font-bold text-destructive">{R$(financeiroQuery.data.totalDespesas)}</p>
              </div>
              <div className="summary-card rounded-lg border border-border bg-card p-4">
                <p className="label text-xs text-muted-foreground">Saldo</p>
                <p className={cn('value mt-1 text-xl font-bold', financeiroQuery.data.saldo >= 0 ? 'text-success' : 'text-destructive')}>{R$(financeiroQuery.data.saldo)}</p>
              </div>
              <div className="summary-card rounded-lg border border-border bg-card p-4">
                <p className="label text-xs text-muted-foreground">Pendente</p>
                <p className="value mt-1 text-xl font-bold text-warning">{R$(financeiroQuery.data.totalPendente)}</p>
              </div>
            </div>
          )}

          {financeiroQuery.data?.porTipo && Object.keys(financeiroQuery.data.porTipo).length > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Distribuição por Tipo</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="py-2 text-left font-medium text-muted-foreground">Tipo</th><th className="py-2 text-right font-medium text-muted-foreground">Valor</th></tr></thead>
                <tbody>
                  {Object.entries(financeiroQuery.data.porTipo).sort((a: any, b: any) => b[1] - a[1]).map(([tipo, val]) => (
                    <tr key={tipo} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted-foreground">{tipo}</td>
                      <td className="py-2 text-right font-medium text-foreground">{R$(val as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {finAnualQuery.data && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-base font-semibold text-foreground">Evolução Anual ({finAnualQuery.data.ano})</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mês</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Receitas</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Despesas</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Saldo</th>
                </tr></thead>
                <tbody>
                  {finAnualQuery.data.meses.map((m: any) => (
                    <tr key={m.mes} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m.mes - 1]}/{finAnualQuery.data.ano}</td>
                      <td className="px-3 py-2 text-right text-success">{R$(m.receitas)}</td>
                      <td className="px-3 py-2 text-right text-destructive">{R$(m.despesas)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', m.saldo >= 0 ? 'text-success' : 'text-destructive')}>{R$(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-3 py-2 text-foreground">Total</td>
                    <td className="px-3 py-2 text-right text-success">{R$(finAnualQuery.data.meses.reduce((s: number, m: any) => s + m.receitas, 0))}</td>
                    <td className="px-3 py-2 text-right text-destructive">{R$(finAnualQuery.data.meses.reduce((s: number, m: any) => s + m.despesas, 0))}</td>
                    <td className="px-3 py-2 text-right text-foreground">{R$(finAnualQuery.data.meses.reduce((s: number, m: any) => s + m.saldo, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, danger }: { label: string; value: any; danger?: boolean }) {
  return (
    <div className={cn('summary-card rounded-lg border px-3 py-2', danger ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30')}>
      <p className="label text-xs text-muted-foreground">{label}</p>
      <p className={cn('value text-lg font-semibold', danger ? 'text-destructive' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ATIVO: 'bg-success/10 text-success', SUSPENSO: 'bg-warning/10 text-warning',
    ENCERRADO: 'bg-info/10 text-info', ARQUIVADO: 'bg-muted text-muted-foreground',
    PENDENTE: 'bg-warning/10 text-warning', CUMPRIDO: 'bg-success/10 text-success',
    PERDIDO: 'bg-destructive/10 text-destructive', CANCELADO: 'bg-muted text-muted-foreground',
  };
  return <span className={cn('badge rounded-full px-2.5 py-0.5 text-xs font-medium', colors[status] || 'bg-muted text-muted-foreground')}>{status}</span>;
}

function UrgenciaBadge({ urgencia }: { urgencia: string }) {
  const colors: Record<string, string> = {
    CRITICA: 'bg-destructive/10 text-destructive', ALTA: 'bg-warning/10 text-warning',
    MEDIA: 'bg-info/10 text-info', BAIXA: 'bg-success/10 text-success',
  };
  return <span className={cn('badge rounded-full px-2.5 py-0.5 text-xs font-medium', colors[urgencia] || 'bg-muted text-muted-foreground')}>{urgencia}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
