'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const AREA_LABELS: Record<string, string> = {
  TRABALHISTA: 'Trabalhista', CIVIL: 'Civil', PENAL: 'Penal', FAMILIA: 'Família',
  TRIBUTARIO: 'Tributário', PREVIDENCIARIO: 'Previdenciário', ADMINISTRATIVO: 'Administrativo',
  EMPRESARIAL: 'Empresarial', CONSUMIDOR: 'Consumidor', AMBIENTAL: 'Ambiental', OUTRO: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  ATIVO: 'Ativo', ARQUIVADO: 'Arquivado', SUSPENSO: 'Suspenso', ENCERRADO: 'Encerrado', EM_RECURSO: 'Em recurso',
};

const AREA_COLORS = ['bg-primary', 'bg-info', 'bg-warning', 'bg-success', 'bg-destructive', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-gray-500'];
const STATUS_COLORS: Record<string, string> = {
  ATIVO: 'bg-success', ARQUIVADO: 'bg-gray-400', SUSPENSO: 'bg-warning', ENCERRADO: 'bg-info', EM_RECURSO: 'bg-purple-500',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-completo'],
    queryFn: () => api.get<any>('/relatorios/dashboard'),
    refetchInterval: 30000,
  });

  const cards = data?.cards;
  const graficos = data?.graficos;

  const R$ = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral do escritório</p>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard title="Total Processos" value={cards?.totalProcessos} loading={isLoading} color="primary" href="/dashboard/processos" />
        <StatCard title="Processos Ativos" value={cards?.processosAtivos} loading={isLoading} color="success" href="/dashboard/processos?status=ATIVO" />
        <StatCard title="Novos no Mês" value={cards?.processosNoMes} loading={isLoading} color="info" href="/dashboard/processos" />
        <StatCard title="Prazos Pendentes" value={cards?.prazosPendentes} loading={isLoading} color="warning" href="/dashboard/tarefas?tab=prazos" />
        <StatCard title="Prazos Urgentes" value={cards?.prazosUrgentes} loading={isLoading} color="destructive" href="/dashboard/tarefas?tab=prazos" />
        <StatCard title="Prazos Vencidos" value={cards?.prazosVencidos} loading={isLoading} color="destructive" href="/dashboard/tarefas?tab=prazos" />
        <StatCard title="Tarefas Pendentes" value={cards?.tarefasPendentes} loading={isLoading} color="warning" href="/dashboard/tarefas" />
        <StatCard title="Tarefas Concl./Mês" value={cards?.tarefasConcluidas} loading={isLoading} color="success" href="/dashboard/tarefas" />
        <StatCard title="Total Clientes" value={cards?.totalClientes} loading={isLoading} color="info" href="/dashboard/clientes" />
        <StatCard title="Atend. Novos" value={cards?.atendimentosNovos} loading={isLoading} color="info" href="/dashboard/chatbot?status=NOVO" />
        <StatCard title="Atend. Aguardando" value={cards?.atendimentosAguardando} loading={isLoading} color="warning" href="/dashboard/chatbot?status=EM_ATENDIMENTO" />
        <StatCard
          title="Saldo Real"
          value={cards?.saldoReal != null ? R$(cards.saldoReal) : undefined}
          loading={isLoading}
          color={cards?.saldoReal >= 0 ? 'success' : 'destructive'}
          href="/dashboard/financeiro?tab=caixa"
        />
      </div>

      {/* Financeiro resumo */}
      {cards && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Financeiro do Mês</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <FinanceCard title="Receitas (previsto)" value={R$(cards.receitaMes)} valueClass="text-success" href="/dashboard/financeiro?tab=receitas" />
            <FinanceCard title="Receitas (recebido)" value={R$(cards.receitaRecebida)} valueClass="text-success" href="/dashboard/financeiro?tab=receitas" />
            <FinanceCard title="Despesas (previsto)" value={R$(cards.despesaMes)} valueClass="text-destructive" href="/dashboard/financeiro?tab=saidas" />
            <FinanceCard title="Despesas (pago)" value={R$(cards.despesaPaga)} valueClass="text-destructive" href="/dashboard/financeiro?tab=saidas" />
            <FinanceCard
              title="Saldo Previsto"
              value={R$(cards.saldoMes)}
              valueClass={cards.saldoMes >= 0 ? 'text-success' : 'text-destructive'}
              href="/dashboard/financeiro?tab=caixa"
            />
            <FinanceCard
              title="Saldo Real (pago)"
              value={R$(cards.saldoReal)}
              valueClass={cards.saldoReal >= 0 ? 'text-success' : 'text-destructive'}
              href="/dashboard/financeiro?tab=caixa"
              highlight={cards.saldoReal >= 0 ? 'success' : 'destructive'}
            />
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Processos por Área */}
        <Link href="/dashboard/processos" className="block rounded-xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Processos por Área</h2>
          {!graficos?.processosPorArea?.length ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {graficos.processosPorArea
                .sort((a: any, b: any) => b.count - a.count)
                .map((item: any, i: number) => {
                  const max = Math.max(...graficos.processosPorArea.map((x: any) => x.count));
                  const pct = max > 0 ? (item.count / max) * 100 : 0;
                  return (
                    <div key={item.area}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{AREA_LABELS[item.area] || item.area}</span>
                        <span className="font-medium text-foreground">{item.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted">
                        <div className={cn('h-2.5 rounded-full transition-all', AREA_COLORS[i % AREA_COLORS.length])} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Link>

        {/* Processos por Status */}
        <Link href="/dashboard/processos" className="block rounded-xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Processos por Status</h2>
          {!graficos?.processosPorStatus?.length ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {graficos.processosPorStatus
                .sort((a: any, b: any) => b.count - a.count)
                .map((item: any) => {
                  const max = Math.max(...graficos.processosPorStatus.map((x: any) => x.count));
                  const pct = max > 0 ? (item.count / max) * 100 : 0;
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{STATUS_LABELS[item.status] || item.status}</span>
                        <span className="font-medium text-foreground">{item.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted">
                        <div className={cn('h-2.5 rounded-full transition-all', STATUS_COLORS[item.status] || 'bg-gray-400')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Link>
      </div>

      {/* Prazos e Processos Recentes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prazos Próximos */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Link href="/dashboard/tarefas?tab=prazos" className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-foreground transition hover:text-primary">
            Prazos Próximos (7 dias)
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
          {!data?.prazosProximos?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum prazo nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-3">
              {data.prazosProximos.map((prazo: any) => {
                const daysLeft = Math.ceil((new Date(prazo.dataLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <Link
                    key={prazo.id}
                    href={prazo.processo?.id ? `/dashboard/processos/${prazo.processo.id}` : '/dashboard/tarefas?tab=prazos'}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{prazo.descricao}</p>
                      <p className="text-xs text-muted-foreground">Processo: {prazo.processo?.numero}</p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(prazo.dataLimite).toLocaleDateString('pt-BR')}
                      </p>
                      <span className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        daysLeft <= 1 ? 'bg-destructive/10 text-destructive' :
                        daysLeft <= 3 ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info',
                      )}>
                        {daysLeft <= 0 ? 'Hoje' : `${daysLeft}d`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Processos Recentes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Link href="/dashboard/processos" className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-foreground transition hover:text-primary">
            Processos Recentes
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
          {!data?.processosRecentes?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum processo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {data.processosRecentes.map((proc: any) => (
                <Link
                  key={proc.id}
                  href={`/dashboard/processos/${proc.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{proc.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {proc.cliente?.user?.name} — {proc.advogado?.name}
                    </p>
                  </div>
                  <span className={cn(
                    'ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    proc.status === 'ATIVO' && 'bg-success/10 text-success',
                    proc.status === 'SUSPENSO' && 'bg-warning/10 text-warning',
                    proc.status === 'ENCERRADO' && 'bg-info/10 text-info',
                    proc.status === 'ARQUIVADO' && 'bg-muted text-muted-foreground',
                  )}>
                    {STATUS_LABELS[proc.status] || proc.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  color,
  href,
}: {
  title: string;
  value: any;
  loading: boolean;
  color: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className={cn(
          'mt-2 text-2xl font-bold',
          color === 'primary' && 'text-primary',
          color === 'info' && 'text-info',
          color === 'warning' && 'text-warning',
          color === 'destructive' && 'text-destructive',
          color === 'success' && 'text-success',
        )}>
          {value ?? 0}
        </p>
      )}
    </>
  );

  const className = cn(
    'rounded-xl border border-border bg-card p-4 transition',
    href && 'cursor-pointer hover:border-primary/40 hover:shadow-sm hover:bg-muted/20',
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={className} title={`Ver ${title}`}>
      {content}
    </Link>
  );
}

function FinanceCard({
  title,
  value,
  valueClass,
  href,
  highlight,
}: {
  title: string;
  value: string;
  valueClass: string;
  href: string;
  highlight?: 'success' | 'destructive';
}) {
  return (
    <Link
      href={href}
      title={`Ver ${title}`}
      className={cn(
        'rounded-xl border bg-card p-4 transition hover:shadow-sm hover:bg-muted/20',
        highlight === 'success' && 'border-2 border-success/40 hover:border-success/60',
        highlight === 'destructive' && 'border-2 border-destructive/40 hover:border-destructive/60',
        !highlight && 'border-border hover:border-primary/40',
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <p className={cn('mt-1 text-lg font-bold', valueClass)}>{value}</p>
    </Link>
  );
}
