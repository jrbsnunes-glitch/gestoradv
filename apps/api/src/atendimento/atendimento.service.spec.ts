import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AtendimentoService } from './atendimento.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { RagService } from '../knowledge/rag.service';
import { KnowledgeFaqService } from '../knowledge/knowledge-faq.service';

describe('AtendimentoService', () => {
  let service: AtendimentoService;
  let prisma: any;
  let chatbot: any;

  beforeEach(async () => {
    prisma = {
      atendimento: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      processo: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      tarefa: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (fn) =>
        fn({
          processo: prisma.processo,
          atendimento: prisma.atendimento,
          tarefa: prisma.tarefa,
          notification: prisma.notification,
        }),
      ),
    };

    chatbot = { isConfigured: false, triagem: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtendimentoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChatbotService, useValue: chatbot },
        { provide: RagService, useValue: { generateReply: jest.fn().mockResolvedValue(null) } },
        { provide: KnowledgeFaqService, useValue: { formatForContext: jest.fn().mockResolvedValue('') } },
      ],
    }).compile();

    service = module.get<AtendimentoService>(AtendimentoService);
  });

  describe('converterEmProcesso', () => {
    const baseAtendimento = {
      id: 'a1',
      nome: 'João',
      canal: 'WHATSAPP',
      status: 'EM_ATENDIMENTO',
      clienteId: 'c1',
      responsavelId: 'adv1',
      mensagemOriginal: 'Caso de demissão sem justa causa.',
      areaDetectada: 'trabalhista',
      processoId: null,
      mensagens: [],
      cliente: null,
      responsavel: null,
    };

    it('deve criar processo, atualizar atendimento, criar tarefa e notificacao em transacao', async () => {
      prisma.atendimento.findUnique.mockResolvedValue(baseAtendimento);
      prisma.processo.findUnique.mockResolvedValue(null);
      prisma.processo.create.mockResolvedValue({ id: 'p1', numero: '0001-00.2026.5.01.0001' });
      prisma.atendimento.update.mockResolvedValue({ ...baseAtendimento, status: 'CONVERTIDO', processoId: 'p1' });
      prisma.tarefa.create.mockResolvedValue({ id: 't1' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });

      const res = await service.converterEmProcesso('a1', 'user1', {
        numero: '0001-00.2026.5.01.0001',
        tribunal: 'TRT1',
      });

      expect(prisma.processo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero: '0001-00.2026.5.01.0001',
            tribunal: 'TRT1',
            area: 'TRABALHISTA',
            clienteId: 'c1',
            advogadoId: 'adv1',
            descricao: expect.stringContaining('demissão'),
          }),
        }),
      );
      expect(prisma.atendimento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: expect.objectContaining({
            status: 'CONVERTIDO',
            processoId: 'p1',
            responsavelId: 'adv1',
          }),
        }),
      );
      expect(prisma.tarefa.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processoId: 'p1',
            responsavelId: 'adv1',
            prioridade: 'ALTA',
          }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'adv1',
            type: 'PROCESSO_CRIADO_VIA_ATENDIMENTO',
          }),
        }),
      );
      expect(res).toHaveProperty('processo');
      expect(res).toHaveProperty('tarefa');
    });

    it('deve falhar se atendimento nao tem cliente', async () => {
      prisma.atendimento.findUnique.mockResolvedValue({ ...baseAtendimento, clienteId: null });

      await expect(
        service.converterEmProcesso('a1', 'user1', {
          numero: '1',
          tribunal: 'TRT1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se ja convertido', async () => {
      prisma.atendimento.findUnique.mockResolvedValue({
        ...baseAtendimento,
        status: 'CONVERTIDO',
        processoId: 'p9',
      });

      await expect(
        service.converterEmProcesso('a1', 'user1', {
          numero: '1',
          tribunal: 'TRT1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se nao tem advogado nem responsavel', async () => {
      prisma.atendimento.findUnique.mockResolvedValue({
        ...baseAtendimento,
        responsavelId: null,
      });

      await expect(
        service.converterEmProcesso('a1', 'user1', {
          numero: '1',
          tribunal: 'TRT1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se numero CNJ ja existe', async () => {
      prisma.atendimento.findUnique.mockResolvedValue(baseAtendimento);
      prisma.processo.findUnique.mockResolvedValue({ id: 'jaexiste' });

      await expect(
        service.converterEmProcesso('a1', 'user1', {
          numero: '1',
          tribunal: 'TRT1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('marcarPerdido', () => {
    it('deve atualizar status e gravar motivo', async () => {
      prisma.atendimento.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.atendimento.update.mockResolvedValue({ id: 'a1', status: 'PERDIDO', motivoPerda: 'cliente desistiu' });

      const res = await service.marcarPerdido('a1', 'cliente desistiu');
      expect(res.status).toBe('PERDIDO');
      expect(prisma.atendimento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PERDIDO', motivoPerda: 'cliente desistiu' },
        }),
      );
    });

    it('deve exigir motivo nao vazio', async () => {
      await expect(service.marcarPerdido('a1', '')).rejects.toThrow(BadRequestException);
      await expect(service.marcarPerdido('a1', '   ')).rejects.toThrow(BadRequestException);
    });
  });
});
