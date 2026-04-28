import { Test, TestingModule } from '@nestjs/testing';
import { ProcessosService } from './processos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProcessosService', () => {
  let service: ProcessosService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      processo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      prazo: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProcessosService>(ProcessosService);
  });

  describe('create', () => {
    it('deve criar um processo', async () => {
      const input = { numero: '0001234-56.2026.5.01.0001', tribunal: 'TRT', area: 'TRABALHISTA' as any, clienteId: 'c1' };
      const expected = { id: 'p1', ...input, advogadoId: 'adv1' };
      prisma.processo.create.mockResolvedValue(expected);

      const result = await service.create('adv1', input);
      expect(result).toEqual(expected);
      expect(prisma.processo.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ advogadoId: 'adv1', numero: input.numero }),
      }));
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      prisma.processo.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.processo.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('deve aplicar filtros', async () => {
      prisma.processo.findMany.mockResolvedValue([]);
      prisma.processo.count.mockResolvedValue(0);

      await service.findAll(1, 20, { status: 'ATIVO', area: 'CIVIL' });
      expect(prisma.processo.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'ATIVO', area: 'CIVIL' },
      }));
    });
  });

  describe('findById', () => {
    it('deve retornar processo existente', async () => {
      prisma.processo.findUnique.mockResolvedValue({ id: 'p1', numero: '123' });
      const result = await service.findById('p1');
      expect(result.id).toBe('p1');
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      prisma.processo.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboardStats', () => {
    it('deve retornar estatísticas', async () => {
      prisma.processo.count.mockResolvedValue(10);
      prisma.prazo.count.mockResolvedValue(5);

      const result = await service.getDashboardStats();
      expect(result).toHaveProperty('totalProcessos');
      expect(result).toHaveProperty('processosAtivos');
      expect(result).toHaveProperty('prazosPendentes');
      expect(result).toHaveProperty('prazosUrgentes');
    });
  });
});
