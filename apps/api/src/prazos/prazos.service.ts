import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePrazoData {
  processoId: string;
  movimentacaoId?: string;
  descricao: string;
  dataLimite: Date;
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  observacoes?: string;
}

@Injectable()
export class PrazosService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePrazoData): Promise<any> {
    return this.prisma.prazo.create({
      data,
      include: {
        processo: { select: { id: true, numero: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20, filters?: { status?: string; urgencia?: string }): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.urgencia) where.urgencia = filters.urgencia;

    const [prazos, total] = await Promise.all([
      this.prisma.prazo.findMany({
        skip,
        take: limit,
        where,
        include: {
          processo: {
            select: { id: true, numero: true, area: true },
            include: {
              advogado: { select: { name: true } },
              cliente: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { dataLimite: 'asc' },
      }),
      this.prisma.prazo.count({ where }),
    ]);

    return {
      data: prazos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findUpcoming(days = 7): Promise<any[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.prazo.findMany({
      where: {
        status: 'PENDENTE',
        dataLimite: { gte: now, lte: future },
      },
      include: {
        processo: {
          select: { id: true, numero: true },
          include: {
            advogado: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { dataLimite: 'asc' },
    });
  }

  async findByProcesso(processoId: string): Promise<any[]> {
    return this.prisma.prazo.findMany({
      where: { processoId, status: 'PENDENTE' },
      orderBy: { dataLimite: 'asc' },
    });
  }

  async markAsDone(id: string): Promise<any> {
    const prazo = await this.prisma.prazo.findUnique({ where: { id } });
    if (!prazo) throw new NotFoundException('Prazo não encontrado');

    return this.prisma.prazo.update({
      where: { id },
      data: { status: 'CUMPRIDO', cumpridoEm: new Date() },
    });
  }
}
