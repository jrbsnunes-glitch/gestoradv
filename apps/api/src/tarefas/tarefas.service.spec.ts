import { Test, TestingModule } from '@nestjs/testing';
import { TarefasService } from './tarefas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TarefasService', () => {
  let service: TarefasService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tarefa: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TarefasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TarefasService>(TarefasService);
  });

  describe('create', () => {
    it('deve criar uma tarefa', async () => {
      const input = { responsavelId: 'u1', titulo: 'Tarefa teste' };
      prisma.tarefa.create.mockResolvedValue({ id: 't1', ...input });

      const result = await service.create(input);
      expect(result.id).toBe('t1');
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      prisma.tarefa.findMany.mockResolvedValue([{ id: 't1' }]);
      prisma.tarefa.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da tarefa', async () => {
      prisma.tarefa.findUnique.mockResolvedValue({ id: 't1' });
      prisma.tarefa.update.mockResolvedValue({ id: 't1', status: 'CONCLUIDA' });

      const result = await service.updateStatus('t1', 'CONCLUIDA');
      expect(result.status).toBe('CONCLUIDA');
    });

    it('deve definir concluidaEm quando status é CONCLUIDA', async () => {
      prisma.tarefa.findUnique.mockResolvedValue({ id: 't1' });
      prisma.tarefa.update.mockResolvedValue({ id: 't1', status: 'CONCLUIDA' });

      await service.updateStatus('t1', 'CONCLUIDA');
      expect(prisma.tarefa.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ concluidaEm: expect.any(Date) }),
      }));
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      prisma.tarefa.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('x', 'CONCLUIDA')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar dados da tarefa', async () => {
      prisma.tarefa.findUnique.mockResolvedValue({ id: 't1' });
      prisma.tarefa.update.mockResolvedValue({ id: 't1', titulo: 'Atualizado' });

      const result = await service.update('t1', { titulo: 'Atualizado' });
      expect(result.titulo).toBe('Atualizado');
    });
  });
});
