import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  async processos(filters?: { status?: string; area?: string; advogadoId?: string; de?: string; ate?: string }): Promise<any> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.area) where.area = filters.area;
    if (filters?.advogadoId) where.advogadoId = filters.advogadoId;
    if (filters?.de || filters?.ate) {
      where.createdAt = {};
      if (filters.de) where.createdAt.gte = new Date(filters.de);
      if (filters.ate) where.createdAt.lte = new Date(filters.ate + 'T23:59:59');
    }

    const processos = await this.prisma.processo.findMany({
      where,
      include: {
        advogado: { select: { id: true, name: true } },
        cliente: { include: { user: { select: { name: true } } } },
        _count: { select: { prazos: true, movimentacoes: true, tarefas: true, lancamentos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = processos.length;
    const porStatus: Record<string, number> = {};
    const porArea: Record<string, number> = {};
    let valorTotal = 0;

    processos.forEach(p => {
      porStatus[p.status] = (porStatus[p.status] || 0) + 1;
      porArea[p.area] = (porArea[p.area] || 0) + 1;
      if (p.valorCausa) valorTotal += Number(p.valorCausa);
    });

    return { total, porStatus, porArea, valorTotal, processos };
  }

  async prazos(filters?: { status?: string; urgencia?: string; de?: string; ate?: string }): Promise<any> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.urgencia) where.urgencia = filters.urgencia;
    if (filters?.de || filters?.ate) {
      where.dataLimite = {};
      if (filters.de) where.dataLimite.gte = new Date(filters.de);
      if (filters.ate) where.dataLimite.lte = new Date(filters.ate + 'T23:59:59');
    }

    const prazos = await this.prisma.prazo.findMany({
      where,
      include: {
        processo: {
          select: { id: true, numero: true, area: true },
          include: { advogado: { select: { name: true } } },
        },
      },
      orderBy: { dataLimite: 'asc' },
    });

    const total = prazos.length;
    const porStatus: Record<string, number> = {};
    const porUrgencia: Record<string, number> = {};

    prazos.forEach(p => {
      porStatus[p.status] = (porStatus[p.status] || 0) + 1;
      porUrgencia[p.urgencia] = (porUrgencia[p.urgencia] || 0) + 1;
    });

    const vencidos = prazos.filter(p => p.status === 'PENDENTE' && new Date(p.dataLimite) < new Date()).length;

    return { total, porStatus, porUrgencia, vencidos, prazos };
  }

  async produtividade(filters?: { de?: string; ate?: string }): Promise<any> {
    const where: any = {};
    if (filters?.de || filters?.ate) {
      where.createdAt = {};
      if (filters.de) where.createdAt.gte = new Date(filters.de);
      if (filters.ate) where.createdAt.lte = new Date(filters.ate + 'T23:59:59');
    }

    const advogados = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ADVOGADO'] }, isActive: true },
      select: {
        id: true,
        name: true,
        processos: { where, select: { id: true, status: true } },
        tarefas: {
          where: { ...where },
          select: { id: true, status: true },
        },
      },
    });

    return advogados.map(a => ({
      id: a.id,
      nome: a.name,
      processosTotal: a.processos.length,
      processosAtivos: a.processos.filter(p => p.status === 'ATIVO').length,
      tarefasTotal: a.tarefas.length,
      tarefasConcluidas: a.tarefas.filter(t => t.status === 'CONCLUIDA').length,
      tarefasPendentes: a.tarefas.filter(t => ['PENDENTE', 'EM_ANDAMENTO'].includes(t.status)).length,
      taxaConclusao: a.tarefas.length > 0
        ? Math.round((a.tarefas.filter(t => t.status === 'CONCLUIDA').length / a.tarefas.length) * 100)
        : 0,
    }));
  }

  async dashboardCompleto(advogadoId?: string): Promise<any> {
    const processoWhere = advogadoId ? { advogadoId } : {};
    const prazoWhere = advogadoId ? { processo: { advogadoId } } : {};

    const now = new Date();
    const mesAtual = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const seteDias = new Date();
    seteDias.setDate(seteDias.getDate() + 7);

    const TIPOS_RECEITA = ['HONORARIO', 'ACORDO', 'REEMBOLSO'];

    const [
      totalProcessos,
      processosAtivos,
      processosSuspensos,
      processosEncerrados,
      prazosPendentes,
      prazosUrgentes,
      prazosVencidos,
      tarefasPendentes,
      tarefasConcluidas,
      totalClientes,
      processosNoMes,
      processosPorArea,
      processosPorStatus,
      prazosProximos,
      processosRecentes,
      lancamentosMes,
      contasPagarMes,
      atendimentosNovos,
      atendimentosAguardando,
    ] = await Promise.all([
      this.prisma.processo.count({ where: processoWhere }),
      this.prisma.processo.count({ where: { ...processoWhere, status: 'ATIVO' } }),
      this.prisma.processo.count({ where: { ...processoWhere, status: 'SUSPENSO' } }),
      this.prisma.processo.count({ where: { ...processoWhere, status: 'ENCERRADO' } }),
      this.prisma.prazo.count({ where: { ...prazoWhere, status: 'PENDENTE' } }),
      this.prisma.prazo.count({
        where: { ...prazoWhere, status: 'PENDENTE', urgencia: { in: ['ALTA', 'CRITICA'] } },
      }),
      this.prisma.prazo.count({
        where: { ...prazoWhere, status: 'PENDENTE', dataLimite: { lt: now } },
      }),
      this.prisma.tarefa.count({
        where: { ...(advogadoId ? { responsavelId: advogadoId } : {}), status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
      }),
      this.prisma.tarefa.count({
        where: {
          ...(advogadoId ? { responsavelId: advogadoId } : {}),
          status: 'CONCLUIDA',
          concluidaEm: { gte: mesAtual },
        },
      }),
      this.prisma.client.count(),
      this.prisma.processo.count({
        where: { ...processoWhere, createdAt: { gte: mesAtual } },
      }),
      this.prisma.processo.groupBy({
        by: ['area'],
        where: processoWhere,
        _count: true,
      }),
      this.prisma.processo.groupBy({
        by: ['status'],
        where: processoWhere,
        _count: true,
      }),
      this.prisma.prazo.findMany({
        where: { ...prazoWhere, status: 'PENDENTE', dataLimite: { gte: now, lte: seteDias } },
        include: { processo: { select: { id: true, numero: true } } },
        orderBy: { dataLimite: 'asc' },
        take: 10,
      }),
      this.prisma.processo.findMany({
        where: processoWhere,
        include: {
          advogado: { select: { name: true } },
          cliente: { include: { user: { select: { name: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.lancamento.findMany({
        where: { status: { not: 'CANCELADO' }, createdAt: { gte: mesAtual, lte: fimMes } },
        select: { tipo: true, status: true, valor: true },
      }),
      this.prisma.contaPagar.findMany({
        where: { status: { not: 'CANCELADO' }, dataVencimento: { gte: mesAtual, lte: fimMes } },
        select: { status: true, valor: true },
      }),
      this.prisma.atendimento.count({ where: { status: 'NOVO' } }),
      this.prisma.atendimento.count({ where: { status: { in: ['NOVO', 'EM_ATENDIMENTO'] } } }),
    ]);

    const receitaMes = lancamentosMes
      .filter(l => TIPOS_RECEITA.includes(l.tipo))
      .reduce((s, l) => s + Number(l.valor), 0);

    const despesaLancamentos = lancamentosMes
      .filter(l => !TIPOS_RECEITA.includes(l.tipo))
      .reduce((s, l) => s + Number(l.valor), 0);

    const despesaContas = contasPagarMes
      .reduce((s, c) => s + Number(c.valor), 0);

    const despesaMes = despesaLancamentos + despesaContas;

    const receitaRecebida = lancamentosMes
      .filter(l => l.status === 'PAGO' && TIPOS_RECEITA.includes(l.tipo))
      .reduce((s, l) => s + Number(l.valor), 0);

    const despesaPaga = lancamentosMes
        .filter(l => l.status === 'PAGO' && !TIPOS_RECEITA.includes(l.tipo))
        .reduce((s, l) => s + Number(l.valor), 0)
      + contasPagarMes
        .filter(c => c.status === 'PAGO')
        .reduce((s, c) => s + Number(c.valor), 0);

    return {
      cards: {
        totalProcessos,
        processosAtivos,
        processosSuspensos,
        processosEncerrados,
        prazosPendentes,
        prazosUrgentes,
        prazosVencidos,
        tarefasPendentes,
        tarefasConcluidas,
        totalClientes,
        processosNoMes,
        receitaMes,
        despesaMes,
        saldoMes: receitaMes - despesaMes,
        receitaRecebida,
        despesaPaga,
        saldoReal: receitaRecebida - despesaPaga,
        atendimentosNovos,
        atendimentosAguardando,
      },
      graficos: {
        processosPorArea: processosPorArea.map(g => ({ area: g.area, count: g._count })),
        processosPorStatus: processosPorStatus.map(g => ({ status: g.status, count: g._count })),
      },
      prazosProximos,
      processosRecentes,
    };
  }

  async agenda(de: string, ate: string): Promise<any> {
    const start = new Date(de);
    const end = new Date(ate + 'T23:59:59');

    const [prazos, tarefas] = await Promise.all([
      this.prisma.prazo.findMany({
        where: { dataLimite: { gte: start, lte: end } },
        include: {
          processo: { select: { id: true, numero: true } },
        },
        orderBy: { dataLimite: 'asc' },
      }),
      this.prisma.tarefa.findMany({
        where: { dataLimite: { gte: start, lte: end } },
        include: {
          processo: { select: { id: true, numero: true } },
          responsavel: { select: { id: true, name: true } },
        },
        orderBy: { dataLimite: 'asc' },
      }),
    ]);

    const events = [
      ...prazos.map(p => ({
        id: p.id,
        type: 'prazo' as const,
        title: p.descricao,
        date: p.dataLimite,
        status: p.status,
        urgencia: p.urgencia,
        processoNumero: p.processo?.numero,
        processoId: p.processo?.id,
      })),
      ...tarefas.map(t => ({
        id: t.id,
        type: 'tarefa' as const,
        title: t.titulo,
        date: t.dataLimite,
        status: t.status,
        prioridade: t.prioridade,
        processoNumero: t.processo?.numero,
        processoId: t.processo?.id,
        responsavel: t.responsavel?.name,
      })),
    ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    return { de, ate, totalEventos: events.length, events };
  }
}
