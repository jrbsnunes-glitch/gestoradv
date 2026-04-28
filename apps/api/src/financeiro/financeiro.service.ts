import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateLancamentoData {
  processoId?: string;
  clienteId?: string;
  descricao: string;
  tipo: string;
  valor: number;
  dataVencimento?: Date;
  formaPagamento?: string;
  observacoes?: string;
}

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService) {}

  async create(criadoPorId: string, data: CreateLancamentoData): Promise<any> {
    return this.prisma.lancamento.create({
      data: {
        ...data,
        tipo: data.tipo as any,
        valor: data.valor,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
        criadoPorId,
      },
      include: {
        processo: { select: { id: true, numero: true } },
        cliente: { include: { user: { select: { name: true } } } },
        criadoPor: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20, filters?: {
    status?: string;
    tipo?: string;
    clienteId?: string;
    processoId?: string;
    mes?: string;
    advogadoId?: string;
  }): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.tipo) where.tipo = filters.tipo;
    if (filters?.clienteId) where.clienteId = filters.clienteId;
    if (filters?.processoId) where.processoId = filters.processoId;
    if (filters?.advogadoId) where.processo = { advogadoId: filters.advogadoId };

    if (filters?.mes) {
      const [year, month] = filters.mes.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.createdAt = { gte: start, lte: end };
    }

    const [lancamentos, total] = await Promise.all([
      this.prisma.lancamento.findMany({
        skip,
        take: limit,
        where,
        include: {
          processo: { select: { id: true, numero: true, advogadoId: true, percentualEscritorio: true, advogado: { select: { percentualEscritorio: true } } } },
          cliente: { include: { user: { select: { name: true } } } },
          criadoPor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lancamento.count({ where }),
    ]);

    return {
      data: lancamentos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<any> {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id },
      include: {
        processo: { select: { id: true, numero: true } },
        cliente: { include: { user: { select: { name: true } } } },
        criadoPor: { select: { id: true, name: true } },
      },
    });
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    return lancamento;
  }

  async update(id: string, data: Partial<CreateLancamentoData>): Promise<any> {
    await this.findById(id);
    return this.prisma.lancamento.update({
      where: { id },
      data: {
        ...data,
        tipo: data.tipo as any,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
      },
      include: {
        processo: { select: { id: true, numero: true } },
        cliente: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async marcarPago(id: string, formaPagamento?: string): Promise<any> {
    await this.findById(id);
    return this.prisma.lancamento.update({
      where: { id },
      data: {
        status: 'PAGO',
        dataPagamento: new Date(),
        formaPagamento: formaPagamento || undefined,
      },
    });
  }

  async cancelar(id: string): Promise<any> {
    await this.findById(id);
    return this.prisma.lancamento.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findById(id);
    await this.prisma.lancamento.delete({ where: { id } });
    return { message: 'Lançamento removido' };
  }

  async getResumoMensal(mes?: string, advogadoId?: string): Promise<any> {
    const now = new Date();
    const year = mes ? parseInt(mes.split('-')[0]) : now.getFullYear();
    const month = mes ? parseInt(mes.split('-')[1]) : now.getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const where: any = { createdAt: { gte: start, lte: end } };
    if (advogadoId) where.processo = { advogadoId };

    const lancamentos = await this.prisma.lancamento.findMany({
      where,
      select: { tipo: true, status: true, valor: true, processo: advogadoId ? { select: { percentualEscritorio: true, advogado: { select: { percentualEscritorio: true } } } } : false },
    });

    const totalReceitas = lancamentos
      .filter(l => ['HONORARIO', 'ACORDO'].includes(l.tipo))
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const totalDespesas = lancamentos
      .filter(l => ['CUSTAS', 'DESPESA'].includes(l.tipo))
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const totalRecebido = lancamentos
      .filter(l => l.status === 'PAGO' && ['HONORARIO', 'ACORDO'].includes(l.tipo))
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const totalPendente = lancamentos
      .filter(l => l.status === 'PENDENTE')
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const porTipo: Record<string, number> = {};
    lancamentos.forEach(l => {
      porTipo[l.tipo] = (porTipo[l.tipo] || 0) + Number(l.valor);
    });

    const porStatus: Record<string, number> = {};
    lancamentos.forEach(l => {
      porStatus[l.status] = (porStatus[l.status] || 0) + Number(l.valor);
    });

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      totalRecebido,
      totalPendente,
      porTipo,
      porStatus,
      totalLancamentos: lancamentos.length,
    };
  }

  private getPercentual(processo: any): number {
    if (!processo) return 70;
    return processo.percentualEscritorio ?? processo.advogado?.percentualEscritorio ?? 70;
  }

  async getCaixa(de: string, ate: string, advogadoId?: string): Promise<any> {
    const now = new Date();
    const safeDe = de || now.toISOString().slice(0, 10);
    const safeAte = ate || safeDe;

    const start = new Date(safeDe + 'T00:00:00');
    const end = new Date(safeAte + 'T23:59:59');

    const TIPOS_ENTRADA = ['HONORARIO', 'ACORDO', 'REEMBOLSO'];

    const lancWhere: any = { status: 'PAGO', dataPagamento: { gte: start, lte: end } };
    if (advogadoId) lancWhere.processo = { advogadoId };

    const [lancamentosPagos, contasPagas] = await Promise.all([
      this.prisma.lancamento.findMany({
        where: lancWhere,
        include: {
          processo: { select: { id: true, numero: true, advogadoId: true, percentualEscritorio: true, advogado: { select: { id: true, percentualEscritorio: true, name: true } } } },
          cliente: { include: { user: { select: { name: true } } } },
        },
        orderBy: { dataPagamento: 'asc' },
      }),
      advogadoId ? [] : this.prisma.contaPagar.findMany({
        where: { status: 'PAGO', dataPagamento: { gte: start, lte: end } },
        orderBy: { dataPagamento: 'asc' },
      }),
    ]);

    const entradas = lancamentosPagos
      .filter(l => TIPOS_ENTRADA.includes(l.tipo))
      .map(l => ({
        id: l.id, fonte: 'lancamento' as const, descricao: l.descricao, tipo: l.tipo,
        valor: Number(l.valor), data: l.dataPagamento, formaPagamento: l.formaPagamento,
        processo: l.processo?.numero, cliente: (l.cliente as any)?.user?.name,
      }));

    const saidasLanc = lancamentosPagos
      .filter(l => !TIPOS_ENTRADA.includes(l.tipo))
      .map(l => ({
        id: l.id, fonte: 'lancamento' as const, descricao: l.descricao, tipo: l.tipo,
        valor: Number(l.valor), data: l.dataPagamento, formaPagamento: l.formaPagamento,
        processo: l.processo?.numero, cliente: (l.cliente as any)?.user?.name,
      }));

    const saidasContas = (contasPagas as any[]).map(c => ({
      id: c.id, fonte: 'conta_pagar' as const, descricao: c.descricao, tipo: c.categoria,
      valor: Number(c.valor), data: c.dataPagamento, formaPagamento: c.formaPagamento,
      fornecedor: c.fornecedor,
    }));

    const saidas = [...saidasLanc, ...saidasContas].sort((a, b) =>
      new Date(a.data!).getTime() - new Date(b.data!).getTime()
    );

    const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);
    const totalSaidas = saidas.reduce((s, e) => s + e.valor, 0);

    let totalReceitasSplit = 0;
    let totalEscritorio = 0;
    let totalAdvogado = 0;
    const porAdvogado: Record<string, { nome: string; receitas: number; escritorio: number; advogado: number; percentual: number }> = {};

    for (const l of lancamentosPagos.filter(l => TIPOS_ENTRADA.includes(l.tipo))) {
      const pct = this.getPercentual(l.processo);
      const valor = Number(l.valor);
      totalReceitasSplit += valor;
      totalEscritorio += valor * (pct / 100);
      totalAdvogado += valor * ((100 - pct) / 100);

      if (l.processo?.advogado) {
        const advId = l.processo.advogadoId || l.processo.advogado.id;
        const advNome = l.processo.advogado.name;
        if (!porAdvogado[advId]) {
          porAdvogado[advId] = { nome: advNome, receitas: 0, escritorio: 0, advogado: 0, percentual: pct };
        }
        porAdvogado[advId].receitas += valor;
        porAdvogado[advId].escritorio += valor * (pct / 100);
        porAdvogado[advId].advogado += valor * ((100 - pct) / 100);
      }
    }

    const split = totalReceitasSplit > 0 ? {
      totalReceitas: Math.round(totalReceitasSplit * 100) / 100,
      valorEscritorio: Math.round(totalEscritorio * 100) / 100,
      valorAdvogado: Math.round(totalAdvogado * 100) / 100,
      porAdvogado: Object.values(porAdvogado).map(a => ({
        ...a,
        receitas: Math.round(a.receitas * 100) / 100,
        escritorio: Math.round(a.escritorio * 100) / 100,
        advogado: Math.round(a.advogado * 100) / 100,
      })),
    } : null;

    return {
      periodo: { de: safeDe, ate: safeAte },
      entradas,
      saidas,
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      totalMovimentacoes: entradas.length + saidas.length,
      split,
    };
  }

  async getResumoAnual(ano?: number, advogadoId?: string): Promise<any> {
    const year = ano || new Date().getFullYear();
    const meses = [];

    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);

      const where: any = { createdAt: { gte: start, lte: end } };
      if (advogadoId) where.processo = { advogadoId };

      const lancamentos = await this.prisma.lancamento.findMany({
        where,
        select: { tipo: true, status: true, valor: true },
      });

      const receitas = lancamentos
        .filter(l => ['HONORARIO', 'ACORDO'].includes(l.tipo))
        .reduce((sum, l) => sum + Number(l.valor), 0);

      const despesas = lancamentos
        .filter(l => ['CUSTAS', 'DESPESA'].includes(l.tipo))
        .reduce((sum, l) => sum + Number(l.valor), 0);

      meses.push({
        mes: m,
        label: `${year}-${String(m).padStart(2, '0')}`,
        receitas,
        despesas,
        saldo: receitas - despesas,
        lancamentos: lancamentos.length,
      });
    }

    return { ano: year, meses };
  }
}
