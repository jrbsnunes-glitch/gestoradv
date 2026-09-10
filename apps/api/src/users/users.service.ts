import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterInput } from '@gestor-adv/validators';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<any> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Localiza usuário pelo login (parte antes do @ no e-mail). */
  async findByLoginUsername(username: string): Promise<any> {
    const normalized = (username ?? '').trim().toLowerCase();
    if (!normalized) return null;
    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        email: { startsWith: `${normalized}@`, mode: 'insensitive' },
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        oabNumber: true,
        oabState: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(data: RegisterInput & { password: string }): Promise<any> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role as any,
        oabNumber: data.oabNumber,
        oabState: data.oabState,
        phone: data.phone,
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          oabNumber: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, data: Partial<{ name: string; phone: string; avatarUrl: string }>) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
      },
    });
  }

  private readonly advogadoSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    oabNumber: true,
    oabState: true,
    phone: true,
    isActive: true,
    especialidades: true,
    percentualEscritorio: true,
    createdAt: true,
    _count: { select: { processos: true } },
  };

  async findAdvogados(): Promise<any> {
    return this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ADVOGADO'] } },
      select: this.advogadoSelect,
      orderBy: { name: 'asc' },
    });
  }

  async createAdvogado(data: {
    name: string;
    email: string;
    phone?: string;
    oabNumber?: string;
    oabState?: string;
    especialidades?: string[];
    percentualEscritorio?: number;
  }): Promise<any> {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Já existe um usuário com este email');

    const tempPassword = await bcrypt.hash('mudar@123', 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: tempPassword,
        role: 'ADVOGADO',
        phone: data.phone,
        oabNumber: data.oabNumber,
        oabState: data.oabState,
        especialidades: data.especialidades || [],
        percentualEscritorio: data.percentualEscritorio ?? 70,
      },
      select: this.advogadoSelect,
    });
  }

  async updateAdvogado(id: string, data: {
    name?: string;
    phone?: string;
    oabNumber?: string;
    oabState?: string;
    especialidades?: string[];
    percentualEscritorio?: number;
    isActive?: boolean;
  }): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Advogado não encontrado');

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.advogadoSelect,
    });
  }

  async getPreferenciasAlerta(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferenciasAlerta: true },
    });
    const defaults = { inapp: true, email: true, whatsapp: true };
    if (!user?.preferenciasAlerta) return defaults;
    return { ...defaults, ...(user.preferenciasAlerta as any) };
  }

  async updatePreferenciasAlerta(userId: string, prefs: { inapp?: boolean; email?: boolean; whatsapp?: boolean }): Promise<any> {
    const current = await this.getPreferenciasAlerta(userId);
    const updated = { ...current, ...prefs };
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferenciasAlerta: updated },
    });
    return updated;
  }
}
