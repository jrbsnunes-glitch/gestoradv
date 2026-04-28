import { Test, TestingModule } from '@nestjs/testing';
import { PrazosService } from './prazos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PrazosService', () => {
  let service: PrazosService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      prazo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrazosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PrazosService>(PrazosService);
  });

  describe('create', () => {
    it('deve criar um prazo', async () => {
      const input = { processoId: 'p1', descricao: 'Prazo teste', dataLimite: new Date() };
      prisma.prazo.create.mockResolvedValue({ id: 'pr1', ...input });

      const result = await service.create(input);
      expect(result.id).toBe('pr1');
    });
  });

  describe('findAll', () => {
    it('deve retornar prazos paginados', async () => {
      prisma.prazo.findMany.mockResolvedValue([{ id: 'pr1' }]);
      prisma.prazo.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('deve aplicar filtros', async () => {
      prisma.prazo.findMany.mockResolvedValue([]);
      prisma.prazo.count.mockResolvedValue(0);

      await service.findAll(1, 20, { status: 'PENDENTE' });
      expect(prisma.prazo.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'PENDENTE' },
      }));
    });
  });

  describe('findUpcoming', () => {
    it('deve retornar prazos dos próximos N dias', async () => {
      prisma.prazo.findMany.mockResolvedValue([{ id: 'pr1' }]);

      const result = await service.findUpcoming(7);
      expect(result).toHaveLength(1);
      expect(prisma.prazo.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDENTE' }),
      }));
    });
  });

  describe('markAsDone', () => {
    it('deve marcar prazo como cumprido', async () => {
      prisma.prazo.findUnique.mockResolvedValue({ id: 'pr1' });
      prisma.prazo.update.mockResolvedValue({ id: 'pr1', status: 'CUMPRIDO' });

      const result = await service.markAsDone('pr1');
      expect(result.status).toBe('CUMPRIDO');
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      prisma.prazo.findUnique.mockResolvedValue(null);
      await expect(service.markAsDone('x')).rejects.toThrow(NotFoundException);
    });
  });
});
