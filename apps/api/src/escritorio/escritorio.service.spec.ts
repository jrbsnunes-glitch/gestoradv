import { Test, TestingModule } from '@nestjs/testing';
import { EscritorioService } from './escritorio.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EscritorioService', () => {
  let service: EscritorioService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      escritorio: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscritorioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EscritorioService>(EscritorioService);
  });

  describe('get', () => {
    it('deve retornar escritório', async () => {
      prisma.escritorio.findFirst.mockResolvedValue({ id: 'e1', cnpj: '12345' });
      const result = await service.get();
      expect(result.cnpj).toBe('12345');
    });
  });

  describe('upsert', () => {
    it('deve criar escritório se não existe', async () => {
      prisma.escritorio.findFirst.mockResolvedValue(null);
      prisma.escritorio.create.mockResolvedValue({ id: 'e1', cnpj: '12345678000190' });

      const result = await service.upsert({ cnpj: '12345678000190', razaoSocial: 'Test' });
      expect(prisma.escritorio.create).toHaveBeenCalled();
    });

    it('deve atualizar escritório se já existe', async () => {
      prisma.escritorio.findFirst.mockResolvedValue({ id: 'e1' });
      prisma.escritorio.update.mockResolvedValue({ id: 'e1', razaoSocial: 'Updated' });

      const result = await service.upsert({ razaoSocial: 'Updated' });
      expect(prisma.escritorio.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'e1' },
      }));
    });
  });

  describe('getLicenseStatus', () => {
    it('deve retornar inactive quando escritório não existe', async () => {
      prisma.escritorio.findFirst.mockResolvedValue(null);
      const result = await service.getLicenseStatus();
      expect(result.active).toBe(false);
    });

    it('deve retornar dados completos da licença', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 15);
      prisma.escritorio.findFirst.mockResolvedValue({
        cnpj: '12345', razaoSocial: 'Test', licencaChave: 'GA-XXX',
        licencaValidade: validDate, licencaPlano: 'professional',
        licencaAtiva: true, licencaUltimaValid: new Date(),
      });

      const result = await service.getLicenseStatus();
      expect(result.active).toBe(true);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('activateLicense', () => {
    it('deve lançar NotFoundException quando CNPJ não existe', async () => {
      prisma.escritorio.findUnique.mockResolvedValue(null);
      await expect(service.activateLicense('99999999000199', 'GA-XXX')).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar chave inválida', async () => {
      prisma.escritorio.findUnique.mockResolvedValue({
        id: 'e1', cnpj: '12345678000190', licencaChave: 'OLD',
        licencaHistorico: [],
      });

      const result = await service.activateLicense('12345678000190', 'GA-INVALID-KEY');
      expect(result.success).toBe(false);
    });
  });

  describe('checkAndRevalidate', () => {
    it('deve retornar valid quando nenhum escritório cadastrado', async () => {
      prisma.escritorio.findFirst.mockResolvedValue(null);
      const result = await service.checkAndRevalidate();
      expect(result.valid).toBe(true);
    });

    it('deve retornar invalid quando licença desativada', async () => {
      prisma.escritorio.findFirst.mockResolvedValue({ id: 'e1', licencaAtiva: false });
      const result = await service.checkAndRevalidate();
      expect(result.valid).toBe(false);
    });

    it('deve desativar quando licença expirada', async () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 1);
      prisma.escritorio.findFirst.mockResolvedValue({
        id: 'e1', licencaAtiva: true, licencaValidade: expired,
      });
      prisma.escritorio.update.mockResolvedValue({});

      const result = await service.checkAndRevalidate();
      expect(result.valid).toBe(false);
      expect(prisma.escritorio.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { licencaAtiva: false },
      }));
    });
  });
});
