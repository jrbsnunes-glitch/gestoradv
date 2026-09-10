import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../knowledge/rag.service';
import { LlmMessage, LlmToolDefinition } from '../llm/llm.types';

const AGENT_SYSTEM = `Você é assistente virtual de um escritório de advocacia brasileiro no WhatsApp.
Use as ferramentas disponíveis para consultar processos, prazos e FAQs.
Responda em português, tom profissional e acolhedor.
Nunca invente dados — use apenas retorno das ferramentas.
Se não puder responder com segurança, use escalar_para_advogado.
NÃO dê parecer jurídico definitivo.`;

const TOOLS: LlmToolDefinition[] = [
  {
    name: 'buscar_processo_cliente',
    description: 'Busca processos do cliente por telefone ou CPF e opcionalmente número CNJ',
    input_schema: {
      type: 'object',
      properties: {
        telefone: { type: 'string' },
        cpf: { type: 'string' },
        numero_cnj: { type: 'string' },
      },
    },
  },
  {
    name: 'listar_prazos_proximos',
    description: 'Lista prazos pendentes nos próximos N dias para processos do cliente',
    input_schema: {
      type: 'object',
      properties: {
        telefone: { type: 'string' },
        cpf: { type: 'string' },
        dias: { type: 'number' },
      },
    },
  },
  {
    name: 'buscar_faq',
    description: 'Busca respostas na base de conhecimento do escritório',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'escalar_para_advogado',
    description: 'Encaminha atendimento para advogado humano quando IA não pode responder',
    input_schema: {
      type: 'object',
      properties: {
        atendimento_id: { type: 'string' },
        motivo: { type: 'string' },
      },
      required: ['motivo'],
    },
  },
];

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private rag: RagService,
  ) {}

  async isEnabled(): Promise<boolean> {
    const esc = await this.prisma.escritorio.findFirst({ select: { aiToolsEnabled: true } });
    return (esc?.aiToolsEnabled ?? true) && (await this.llm.isConfigured());
  }

  async runAgent(params: {
    userMessage: string;
    telefone?: string;
    atendimentoId?: string;
    history?: string;
  }): Promise<{ reply: string; escalated: boolean }> {
    if (!(await this.isEnabled())) {
      return { reply: '', escalated: false };
    }

    let messages: LlmMessage[] = [
      {
        role: 'user',
        content: `${params.history ? `Histórico:\n${params.history}\n\n` : ''}Mensagem: ${params.userMessage}`,
      },
    ];

    for (let round = 0; round < 3; round++) {
      const result = await this.llm.complete({
        system: AGENT_SYSTEM,
        messages,
        tools: TOOLS,
        maxTokens: 1024,
      });

      if (!result.toolCalls.length) {
        return { reply: result.text.trim(), escalated: false };
      }

      const toolResults: string[] = [];
      let escalated = false;

      for (const call of result.toolCalls) {
        const output = await this.executeTool(call.name, {
          ...call.input,
          telefone: params.telefone,
          atendimento_id: params.atendimentoId,
        });
        if (call.name === 'escalar_para_advogado') escalated = true;
        toolResults.push(`[${call.name}]: ${output}`);
      }

      messages = [
        ...messages,
        { role: 'assistant', content: result.text || '(tool call)' },
        { role: 'user', content: `Resultados das ferramentas:\n${toolResults.join('\n')}` },
      ];

      if (escalated) {
        const final = await this.llm.complete({ system: AGENT_SYSTEM, messages, maxTokens: 512 });
        return { reply: final.text.trim(), escalated: true };
      }
    }

    return { reply: 'Vou encaminhar sua mensagem para um advogado do escritório.', escalated: true };
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    try {
      switch (name) {
        case 'buscar_processo_cliente':
          return JSON.stringify(await this.buscarProcessoCliente(input));
        case 'listar_prazos_proximos':
          return JSON.stringify(await this.listarPrazosProximos(input));
        case 'buscar_faq': {
          const query = String(input.query || '');
          const reply = await this.rag.generateReply(query);
          return reply || 'Nenhuma informação encontrada na base.';
        }
        case 'escalar_para_advogado':
          return await this.escalarParaAdvogado(input);
        default:
          return 'Ferramenta desconhecida';
      }
    } catch (err: any) {
      this.logger.warn(`Tool ${name} falhou: ${err.message}`);
      return `Erro: ${err.message}`;
    }
  }

  private async findClientByPhoneOrCpf(telefone?: string, cpf?: string) {
    if (cpf) {
      const clean = cpf.replace(/\D/g, '');
      const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      return this.prisma.client.findFirst({ where: { cpfCnpj: formatted } });
    }
    if (telefone) {
      const atend = await this.prisma.atendimento.findFirst({
        where: { telefone, clienteId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { clienteId: true },
      });
      if (atend?.clienteId) {
        return this.prisma.client.findUnique({ where: { id: atend.clienteId } });
      }
    }
    return null;
  }

  private async buscarProcessoCliente(input: Record<string, unknown>) {
    const client = await this.findClientByPhoneOrCpf(
      input.telefone as string | undefined,
      input.cpf as string | undefined,
    );
    if (!client) return { encontrado: false, processos: [] };

    const where: any = { clienteId: client.id };
    if (input.numero_cnj) {
      where.numero = { contains: String(input.numero_cnj), mode: 'insensitive' };
    }

    const processos = await this.prisma.processo.findMany({
      where,
      select: { numero: true, area: true, status: true, tribunal: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return { encontrado: true, processos };
  }

  private async listarPrazosProximos(input: Record<string, unknown>) {
    const dias = Number(input.dias) || 30;
    const client = await this.findClientByPhoneOrCpf(
      input.telefone as string | undefined,
      input.cpf as string | undefined,
    );
    if (!client) return { prazos: [] };

    const limite = new Date();
    limite.setDate(limite.getDate() + dias);

    const prazos = await this.prisma.prazo.findMany({
      where: {
        status: 'PENDENTE',
        dataLimite: { lte: limite },
        processo: { clienteId: client.id },
      },
      include: { processo: { select: { numero: true } } },
      orderBy: { dataLimite: 'asc' },
      take: 15,
    });

    return {
      prazos: prazos.map((p) => ({
        descricao: p.descricao,
        dataLimite: p.dataLimite,
        processo: p.processo.numero,
        urgencia: p.urgencia,
      })),
    };
  }

  private async escalarParaAdvogado(input: Record<string, unknown>): Promise<string> {
    const motivo = String(input.motivo || 'Solicitação do cliente');
    const atendimentoId = input.atendimento_id as string | undefined;

    if (atendimentoId) {
      await this.prisma.atendimento.update({
        where: { id: atendimentoId },
        data: { status: 'EM_ATENDIMENTO' },
      });

      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'ADVOGADO'] }, isActive: true },
        select: { id: true },
      });

      await Promise.all(
        admins.map((a) =>
          this.prisma.notification.create({
            data: {
              userId: a.id,
              title: 'Atendimento escalado pela IA',
              message: motivo,
              type: 'ATENDIMENTO_URGENTE',
              data: { atendimentoId },
            },
          }),
        ),
      );
    }

    return `Escalado: ${motivo}`;
  }
}
