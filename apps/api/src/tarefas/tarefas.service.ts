import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTarefaData {
  processoId?: string;
  responsavelId: string;
  titulo: string;
  descricao?: string;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  dataLimite?: Date;
}

@Injectable()
export class TarefasService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTarefaData): Promise<any> {
    return this.prisma.tarefa.create({
      data,
      include: {
        processo: { select: { id: true, numero: true } },
        responsavel: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20, filters?: { status?: string; responsavelId?: string }): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.responsavelId) where.responsavelId = filters.responsavelId;

    const [tarefas, total] = await Promise.all([
      this.prisma.tarefa.findMany({
        skip,
        take: limit,
        where,
        include: {
          processo: { select: { id: true, numero: true } },
          responsavel: { select: { id: true, name: true } },
        },
        orderBy: [{ prioridade: 'desc' }, { dataLimite: 'asc' }],
      }),
      this.prisma.tarefa.count({ where }),
    ]);

    return {
      data: tarefas,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, status: string): Promise<any> {
    const tarefa = await this.prisma.tarefa.findUnique({ where: { id } });
    if (!tarefa) throw new NotFoundException('Tarefa não encontrada');

    return this.prisma.tarefa.update({
      where: { id },
      data: {
        status: status as any,
        concluidaEm: status === 'CONCLUIDA' ? new Date() : null,
      },
    });
  }

  async update(id: string, data: Partial<CreateTarefaData>): Promise<any> {
    const tarefa = await this.prisma.tarefa.findUnique({ where: { id } });
    if (!tarefa) throw new NotFoundException('Tarefa não encontrada');

    return this.prisma.tarefa.update({
      where: { id },
      data,
      include: {
        processo: { select: { id: true, numero: true } },
        responsavel: { select: { id: true, name: true } },
      },
    });
  }
}
