import { Test, TestingModule } from '@nestjs/testing';
import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('FinanceiroService', () => {
  let service: FinanceiroService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lancamento: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceiroService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinanceiroService>(FinanceiroService);
  });

  describe('create', () => {
    it('deve criar um lançamento', async () => {
      const input = { descricao: 'Honorários', tipo: 'HONORARIO', valor: 5000 };
      prisma.lancamento.create.mockResolvedValue({ id: 'l1', ...input, criadoPorId: 'u1' });

      const result = await service.create('u1', input);
      expect(result.id).toBe('l1');
      expect(prisma.lancamento.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      prisma.lancamento.findMany.mockResolvedValue([{ id: 'l1' }]);
      prisma.lancamento.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('deve aplicar filtros', async () => {
      prisma.lancamento.findMany.mockResolvedValue([]);
      prisma.lancamento.count.mockResolvedValue(0);

      await service.findAll(1, 20, { status: 'PAGO', tipo: 'HONORARIO' });
      expect(prisma.lancamento.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'PAGO', tipo: 'HONORARIO' }),
      }));
    });
  });

  describe('findById', () => {
    it('deve retornar lançamento existente', async () => {
      prisma.lancamento.findUnique.mockResolvedValue({ id: 'l1' });
      const result = await service.findById('l1');
      expect(result.id).toBe('l1');
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      prisma.lancamento.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('marcarPago', () => {
    it('deve marcar como pago', async () => {
      prisma.lancamento.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.lancamento.update.mockResolvedValue({ id: 'l1', status: 'PAGO' });

      const result = await service.marcarPago('l1', 'PIX');
      expect(result.status).toBe('PAGO');
      expect(prisma.lancamento.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'PAGO', formaPagamento: 'PIX' }),
      }));
    });
  });

  describe('cancelar', () => {
    it('deve cancelar lançamento', async () => {
      prisma.lancamento.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.lancamento.update.mockResolvedValue({ id: 'l1', status: 'CANCELADO' });

      const result = await service.cancelar('l1');
      expect(result.status).toBe('CANCELADO');
    });
  });

  describe('remove', () => {
    it('deve remover lançamento', async () => {
      prisma.lancamento.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.lancamento.delete.mockResolvedValue({});

      const result = await service.remove('l1');
      expect(result.message).toBe('Lançamento removido');
    });
  });

  describe('getResumoMensal', () => {
    it('deve calcular resumo corretamente', async () => {
      prisma.lancamento.findMany.mockResolvedValue([
        { tipo: 'HONORARIO', status: 'PAGO', valor: 5000 },
        { tipo: 'CUSTAS', status: 'PENDENTE', valor: 1000 },
        { tipo: 'ACORDO', status: 'PAGO', valor: 3000 },
      ]);

      const result = await service.getResumoMensal();
      expect(result.totalReceitas).toBe(8000);
      expect(result.totalDespesas).toBe(1000);
      expect(result.saldo).toBe(7000);
      expect(result.totalRecebido).toBe(8000);
      expect(result.totalPendente).toBe(1000);
      expect(result.totalLancamentos).toBe(3);
    });
  });
});
