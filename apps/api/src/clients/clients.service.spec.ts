import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        update: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      processo: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  describe('create', () => {
    it('deve criar cliente com perfil e usuário', async () => {
      const expected = { id: 'u1', email: 'c@test.com', clientProfile: { id: 'cp1' } };
      prisma.user.create.mockResolvedValue(expected);

      const result = await service.create({ name: 'Cliente', email: 'c@test.com' });
      expect(result.clientProfile).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ role: 'CLIENTE' }),
      }));
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      prisma.client.findMany.mockResolvedValue([{ id: 'c1' }]);
      prisma.client.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('deve lançar NotFoundException quando não existe', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });

    it('deve retornar cliente com user', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1', user: { name: 'Test' } });
      const result = await service.findById('c1');
      expect(result.user.name).toBe('Test');
    });
  });

  describe('remove', () => {
    it('deve deletar cliente e desativar user', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1', user: { id: 'u1' } });
      prisma.client.delete.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.remove('c1');
      expect(result.message).toBe('Cliente removido com sucesso');
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { isActive: false },
      }));
    });
  });

  describe('findProcessos', () => {
    it('deve retornar processos do cliente', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1', user: { id: 'u1' } });
      prisma.processo.findMany.mockResolvedValue([{ id: 'p1', numero: '123' }]);

      const result = await service.findProcessos('c1');
      expect(result).toHaveLength(1);
    });
  });
});
