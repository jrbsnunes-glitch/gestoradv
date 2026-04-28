import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  birthDate?: Date;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  leadSource?: string;
  consentLgpd?: boolean;
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateClientData): Promise<any> {
    const tempPassword = await bcrypt.hash('mudar@123', 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: tempPassword,
        role: 'CLIENTE',
        phone: data.phone,
        clientProfile: {
          create: {
            cpfCnpj: data.cpfCnpj,
            birthDate: data.birthDate,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            notes: data.notes,
            leadSource: data.leadSource,
            consentLgpd: data.consentLgpd ?? false,
            consentDate: data.consentLgpd ? new Date() : null,
          },
        },
      },
      include: { clientProfile: true },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, isActive: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count(),
    ]);

    return {
      data: clients,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
        processos: { select: { id: true, numero: true, area: true, status: true } },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async update(id: string, data: Partial<CreateClientData>) {
    await this.findById(id);
    const { name, email, phone, ...clientData } = data;

    return this.prisma.client.update({
      where: { id },
      data: {
        ...clientData,
        user: name || email || phone
          ? { update: { ...(name && { name }), ...(email && { email }), ...(phone && { phone }) } }
          : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async remove(id: string): Promise<any> {
    const client = await this.findById(id);
    await this.prisma.client.delete({ where: { id } });
    await this.prisma.user.update({
      where: { id: client.user.id },
      data: { isActive: false },
    });
    return { message: 'Cliente removido com sucesso' };
  }

  async findProcessos(id: string): Promise<any> {
    await this.findById(id);
    return this.prisma.processo.findMany({
      where: { clienteId: id },
      include: {
        advogado: { select: { name: true } },
        _count: { select: { prazos: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
