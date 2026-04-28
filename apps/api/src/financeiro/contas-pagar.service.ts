import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateContaPagarData {
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  formaPagamento?: string;
  recorrencia?: string;
  contaFixa?: boolean;
  fornecedor?: string;
  observacoes?: string;
}

@Injectable()
export class ContasPagarService {
  constructor(private prisma: PrismaService) {}

  async create(criadoPorId: string, data: CreateContaPagarData): Promise<any> {
    return this.prisma.contaPagar.create({
      data: {
        descricao: data.descricao,
        categoria: data.categoria as any,
        valor: data.valor,
        dataVencimento: new Date(data.dataVencimento),
        formaPagamento: data.formaPagamento,
        recorrencia: (data.recorrencia as any) || 'UNICA',
        contaFixa: data.contaFixa ?? false,
        fornecedor: data.fornecedor,
        observacoes: data.observacoes,
        criadoPorId,
      },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
  }

  async findAll(page = 1, limit = 20, filters?: {
    status?: string;
    categoria?: string;
    contaFixa?: string;
    mes?: string;
  }): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.categoria) where.categoria = filters.categoria;
    if (filters?.contaFixa === 'true') where.contaFixa = true;
    if (filters?.contaFixa === 'false') where.contaFixa = false;

    if (filters?.mes) {
      const [year, month] = filters.mes.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.dataVencimento = { gte: start, lte: end };
    }

    const [contas, total] = await Promise.all([
      this.prisma.contaPagar.findMany({
        skip,
        take: limit,
        where,
        include: { criadoPor: { select: { id: true, name: true } } },
        orderBy: { dataVencimento: 'asc' },
      }),
      this.prisma.contaPagar.count({ where }),
    ]);

    return {
      data: contas,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<any> {
    const conta = await this.prisma.contaPagar.findUnique({
      where: { id },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
    if (!conta) throw new NotFoundException('Conta não encontrada');
    return conta;
  }

  async update(id: string, data: Partial<CreateContaPagarData>): Promise<any> {
    await this.findById(id);
    return this.prisma.contaPagar.update({
      where: { id },
      data: {
        ...data,
        categoria: data.categoria as any,
        recorrencia: data.recorrencia as any,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
      },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
  }

  async marcarPago(id: string, formaPagamento?: string): Promise<any> {
    await this.findById(id);
    return this.prisma.contaPagar.update({
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
    return this.prisma.contaPagar.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findById(id);
    await this.prisma.contaPagar.delete({ where: { id } });
    return { message: 'Conta removida' };
  }

  async getResumo(mes?: string): Promise<any> {
    const now = new Date();
    const year = mes ? parseInt(mes.split('-')[0]) : now.getFullYear();
    const month = mes ? parseInt(mes.split('-')[1]) : now.getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const contas = await this.prisma.contaPagar.findMany({
      where: { dataVencimento: { gte: start, lte: end } },
      select: { categoria: true, status: true, valor: true, contaFixa: true },
    });

    const totalMes = contas.reduce((s, c) => s + Number(c.valor), 0);
    const totalPago = contas.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor), 0);
    const totalPendente = contas.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor), 0);
    const totalFixas = contas.filter(c => c.contaFixa).reduce((s, c) => s + Number(c.valor), 0);
    const totalVariaveis = contas.filter(c => !c.contaFixa).reduce((s, c) => s + Number(c.valor), 0);

    const porCategoria: Record<string, number> = {};
    contas.forEach(c => {
      porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + Number(c.valor);
    });

    const vencidas = await this.prisma.contaPagar.count({
      where: { status: 'PENDENTE', dataVencimento: { lt: now } },
    });

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      totalMes,
      totalPago,
      totalPendente,
      totalFixas,
      totalVariaveis,
      porCategoria,
      totalContas: contas.length,
      vencidas,
    };
  }

  async gerarRecorrentes(criadoPorId: string): Promise<any> {
    const contasFixas = await this.prisma.contaPagar.findMany({
      where: { contaFixa: true, recorrencia: { not: 'UNICA' } },
      orderBy: { dataVencimento: 'desc' },
      distinct: ['descricao', 'categoria'],
    });

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    let criadas = 0;

    for (const conta of contasFixas) {
      const vencStr = conta.dataVencimento.toISOString().slice(0, 7);
      if (vencStr >= mesAtual) continue;

      const novaData = new Date(conta.dataVencimento);
      switch (conta.recorrencia) {
        case 'MENSAL': novaData.setMonth(novaData.getMonth() + 1); break;
        case 'BIMESTRAL': novaData.setMonth(novaData.getMonth() + 2); break;
        case 'TRIMESTRAL': novaData.setMonth(novaData.getMonth() + 3); break;
        case 'SEMESTRAL': novaData.setMonth(novaData.getMonth() + 6); break;
        case 'ANUAL': novaData.setFullYear(novaData.getFullYear() + 1); break;
      }

      const novaVencStr = novaData.toISOString().slice(0, 7);
      if (novaVencStr !== mesAtual) continue;

      const jaExiste = await this.prisma.contaPagar.findFirst({
        where: {
          descricao: conta.descricao,
          categoria: conta.categoria,
          dataVencimento: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
        },
      });

      if (!jaExiste) {
        await this.prisma.contaPagar.create({
          data: {
            descricao: conta.descricao,
            categoria: conta.categoria,
            valor: conta.valor,
            dataVencimento: novaData,
            recorrencia: conta.recorrencia,
            contaFixa: true,
            fornecedor: conta.fornecedor,
            observacoes: conta.observacoes,
            criadoPorId,
          },
        });
        criadas++;
      }
    }

    return { message: `${criadas} conta(s) recorrente(s) gerada(s) para ${mesAtual}`, criadas };
  }
}
