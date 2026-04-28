import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessoInput, UpdateProcessoInput } from '@gestor-adv/validators';

interface ConcluirProcessoData {
  resultado: 'GANHO' | 'PERDIDO' | 'ACORDO' | 'DESISTENCIA';
  valorReceber?: number;
  dataPrevistaPagamento?: Date;
}

@Injectable()
export class ProcessosService {
  constructor(private prisma: PrismaService) {}

  async create(advogadoId: string, data: CreateProcessoInput): Promise<any> {
    const { advogadoId: _ignored, percentualEscritorio, ...rest } = data as any;
    return this.prisma.processo.create({
      data: {
        ...rest,
        valorCausa: rest.valorCausa ?? undefined,
        advogadoId,
        percentualEscritorio: percentualEscritorio ?? null,
      },
      include: {
        advogado: { select: { id: true, name: true, percentualEscritorio: true } },
        cliente: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async findAll(page = 1, limit = 20, filters?: { status?: string; area?: string; advogadoId?: string }): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.area) where.area = filters.area;
    if (filters?.advogadoId) where.advogadoId = filters.advogadoId;

    const [processos, total] = await Promise.all([
      this.prisma.processo.findMany({
        skip,
        take: limit,
        where,
        include: {
          advogado: { select: { id: true, name: true } },
          cliente: { include: { user: { select: { name: true } } } },
          _count: { select: { prazos: true, movimentacoes: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.processo.count({ where }),
    ]);

    return {
      data: processos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<any> {
    const processo = await this.prisma.processo.findUnique({
      where: { id },
      include: {
        advogado: { select: { id: true, name: true, email: true } },
        cliente: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        movimentacoes: { orderBy: { data: 'desc' }, take: 20 },
        prazos: { orderBy: { dataLimite: 'asc' }, where: { status: 'PENDENTE' } },
        documentos: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!processo) throw new NotFoundException('Processo não encontrado');
    return processo;
  }

  async update(id: string, data: UpdateProcessoInput): Promise<any> {
    await this.findById(id);
    return this.prisma.processo.update({
      where: { id },
      data: {
        ...data,
        valorCausa: data.valorCausa ?? undefined,
      },
    });
  }

  async concluir(id: string, data: ConcluirProcessoData, userId: string): Promise<any> {
    const processo = await this.findById(id);
    if (processo.status === 'ENCERRADO') {
      throw new BadRequestException('Processo já está encerrado');
    }

    const resultado = data.resultado as any;

    const updated = await this.prisma.processo.update({
      where: { id },
      data: {
        status: 'ENCERRADO',
        resultado,
        concluidoEm: new Date(),
      },
      include: {
        advogado: { select: { id: true, name: true } },
        cliente: { include: { user: { select: { name: true } } } },
      },
    });

    if ((resultado === 'GANHO' || resultado === 'ACORDO') && data.valorReceber && data.dataPrevistaPagamento) {
      await this.prisma.lancamento.create({
        data: {
          processoId: id,
          clienteId: processo.clienteId,
          descricao: `Honorários - ${resultado === 'ACORDO' ? 'Acordo' : 'Processo Ganho'} - ${processo.numero}`,
          tipo: resultado === 'ACORDO' ? 'ACORDO' : 'HONORARIO',
          status: 'PENDENTE',
          valor: data.valorReceber,
          dataVencimento: new Date(data.dataPrevistaPagamento),
          criadoPorId: userId,
        },
      });
    }

    await this.prisma.prazo.updateMany({
      where: { processoId: id, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });

    await this.prisma.tarefa.updateMany({
      where: {
        processoId: id,
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      },
      data: { status: 'CANCELADA' },
    });

    return updated;
  }

  async getDashboardStats(advogadoId?: string) {
    const where = advogadoId ? { advogadoId } : {};

    const [totalProcessos, processosAtivos, prazosPendentes, prazosUrgentes] = await Promise.all([
      this.prisma.processo.count({ where }),
      this.prisma.processo.count({ where: { ...where, status: 'ATIVO' } }),
      this.prisma.prazo.count({
        where: { status: 'PENDENTE', processo: where },
      }),
      this.prisma.prazo.count({
        where: {
          status: 'PENDENTE',
          urgencia: { in: ['ALTA', 'CRITICA'] },
          processo: where,
        },
      }),
    ]);

    return { totalProcessos, processosAtivos, prazosPendentes, prazosUrgentes };
  }
}
