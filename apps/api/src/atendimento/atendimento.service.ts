import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import * as bcrypt from 'bcrypt';

const TRIAGEM_CLASSIFICACAO_PROMPT = `Você é um classificador jurídico. Analise a mensagem do cliente e retorne APENAS um JSON (sem markdown, sem texto extra) com:
{
  "area": "trabalhista|civil|penal|familia|tributario|previdenciario|consumidor|administrativo|empresarial|ambiental|outro",
  "urgencia": 0-10,
  "complexidade": "baixa|media|alta",
  "resumo": "resumo de 1 linha do caso"
}`;

const SUGESTAO_RESPOSTA_PROMPT = `Você é um assistente jurídico de um escritório de advocacia brasileiro. 
Com base na mensagem do cliente e na triagem feita, elabore uma resposta profissional e empática.
A resposta deve:
- Agradecer o contato
- Demonstrar que entendeu o caso
- Orientar sobre próximos passos
- Ser clara e acessível (sem jargão excessivo)
- Ter tom profissional mas acolhedor
- NÃO dar parecer jurídico definitivo
- Sugerir agendamento de consulta se aplicável`;

@Injectable()
export class AtendimentoService {
  constructor(
    private prisma: PrismaService,
    private chatbot: ChatbotService,
  ) {}

  async create(data: {
    nome: string;
    telefone?: string;
    email?: string;
    canal: string;
    assunto?: string;
    mensagem: string;
  }): Promise<any> {
    const atendimento = await this.prisma.atendimento.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email,
        canal: data.canal as any,
        assunto: data.assunto,
        mensagemOriginal: data.mensagem,
        mensagens: {
          create: {
            remetente: 'CLIENTE',
            conteudo: data.mensagem,
            enviadaVia: data.canal,
          },
        },
      },
      include: { mensagens: true },
    });

    this.runTriagem(atendimento.id, data.mensagem).catch(() => {});

    return atendimento;
  }

  private async runTriagem(atendimentoId: string, mensagem: string) {
    if (!this.chatbot.isConfigured) return;

    try {
      const response = await this.chatbot.triagem([
        { role: 'user', content: `${TRIAGEM_CLASSIFICACAO_PROMPT}\n\nMensagem do cliente:\n${mensagem}` },
      ]);

      let parsed: any;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {}

      if (parsed) {
        await this.prisma.atendimento.update({
          where: { id: atendimentoId },
          data: {
            areaDetectada: parsed.area || null,
            urgencia: typeof parsed.urgencia === 'number' ? parsed.urgencia : 0,
            complexidade: parsed.complexidade || null,
            assunto: parsed.resumo || undefined,
          },
        });
      }
    } catch {}
  }

  async findAll(filters?: {
    status?: string;
    canal?: string;
    responsavelId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.canal) where.canal = filters.canal;
    if (filters?.responsavelId) where.responsavelId = filters.responsavelId;

    const [data, total] = await Promise.all([
      this.prisma.atendimento.findMany({
        where,
        skip,
        take: limit,
        include: {
          responsavel: { select: { id: true, name: true } },
          cliente: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { mensagens: true } },
        },
        orderBy: [{ urgencia: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.atendimento.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string): Promise<any> {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id },
      include: {
        responsavel: { select: { id: true, name: true } },
        cliente: { include: { user: { select: { id: true, name: true, email: true } } } },
        mensagens: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!atendimento) throw new NotFoundException('Atendimento não encontrado');
    return atendimento;
  }

  async responder(id: string, userId: string, conteudo: string): Promise<any> {
    await this.findById(id);

    const mensagem = await this.prisma.atendimentoMensagem.create({
      data: {
        atendimentoId: id,
        remetente: 'ADVOGADO',
        conteudo,
        enviadaVia: 'SISTEMA',
      },
    });

    await this.prisma.atendimento.update({
      where: { id },
      data: {
        status: 'RESPONDIDO',
        responsavelId: userId,
      },
    });

    return mensagem;
  }

  async sugerirResposta(id: string): Promise<any> {
    const atendimento = await this.findById(id);

    if (!this.chatbot.isConfigured) {
      return { sugestao: 'IA não configurada. Configure ANTHROPIC_API_KEY no .env.' };
    }

    const historico = atendimento.mensagens
      .filter((m: any) => m.remetente !== 'IA_SUGESTAO')
      .map((m: any) => `[${m.remetente}]: ${m.conteudo}`)
      .join('\n');

    const context = `${SUGESTAO_RESPOSTA_PROMPT}

TRIAGEM:
- Área: ${atendimento.areaDetectada || 'não classificada'}
- Urgência: ${atendimento.urgencia}/10
- Complexidade: ${atendimento.complexidade || 'não avaliada'}

HISTÓRICO:
${historico}

Gere uma resposta profissional para enviar ao cliente:`;

    const reply = await this.chatbot.triagem([{ role: 'user', content: context }]);

    await this.prisma.atendimentoMensagem.create({
      data: {
        atendimentoId: id,
        remetente: 'IA_SUGESTAO',
        conteudo: reply,
        enviadaVia: 'SISTEMA',
      },
    });

    return { sugestao: reply };
  }

  async updateStatus(id: string, status: string): Promise<any> {
    await this.findById(id);
    return this.prisma.atendimento.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async atribuir(id: string, responsavelId: string): Promise<any> {
    await this.findById(id);
    return this.prisma.atendimento.update({
      where: { id },
      data: {
        responsavelId,
        status: 'EM_ATENDIMENTO',
      },
    });
  }

  async vincularCliente(id: string, clienteId: string): Promise<any> {
    await this.findById(id);
    return this.prisma.atendimento.update({
      where: { id },
      data: { clienteId },
    });
  }

  async addMensagemCliente(telefone: string, conteudo: string): Promise<any> {
    const existente = await this.prisma.atendimento.findFirst({
      where: {
        telefone,
        canal: 'WHATSAPP',
        status: { in: ['NOVO', 'EM_ATENDIMENTO', 'RESPONDIDO'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existente) {
      await this.prisma.atendimentoMensagem.create({
        data: {
          atendimentoId: existente.id,
          remetente: 'CLIENTE',
          conteudo,
          enviadaVia: 'WHATSAPP',
        },
      });
      if (existente.status === 'RESPONDIDO') {
        await this.prisma.atendimento.update({
          where: { id: existente.id },
          data: { status: 'EM_ATENDIMENTO' },
        });
      }
      return existente;
    }

    return this.create({
      nome: telefone,
      telefone,
      canal: 'WHATSAPP',
      mensagem: conteudo,
    });
  }

  async getStats(): Promise<any> {
    const [novos, emAtendimento, respondidos, total] = await Promise.all([
      this.prisma.atendimento.count({ where: { status: 'NOVO' } }),
      this.prisma.atendimento.count({ where: { status: 'EM_ATENDIMENTO' } }),
      this.prisma.atendimento.count({ where: { status: 'RESPONDIDO' } }),
      this.prisma.atendimento.count(),
    ]);
    return { novos, emAtendimento, respondidos, total };
  }

  async aprovarCadastro(id: string): Promise<any> {
    const atendimento = await this.findById(id);

    if (atendimento.etapaBot !== 'CADASTRO_PENDENTE') {
      throw new BadRequestException('Este atendimento não possui pré-cadastro pendente');
    }

    const dados = atendimento.dadosBot as any;
    if (!dados?.nome || !dados?.email) {
      throw new BadRequestException('Dados de cadastro incompletos');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dados.email } });
    if (existingUser) {
      throw new BadRequestException('Já existe um usuário com este email');
    }

    const tempPassword = await bcrypt.hash('mudar@123', 12);

    const user = await this.prisma.user.create({
      data: {
        email: dados.email,
        name: dados.nome,
        password: tempPassword,
        role: 'CLIENTE',
        phone: dados.telefone || atendimento.telefone,
        clientProfile: {
          create: {
            cpfCnpj: dados.cpf || null,
            leadSource: 'whatsapp',
            consentLgpd: true,
            consentDate: new Date(),
          },
        },
      },
      include: { clientProfile: true },
    });

    await this.prisma.atendimento.update({
      where: { id },
      data: {
        clienteId: user.clientProfile!.id,
        etapaBot: null,
        dadosBot: { ...dados, status: 'APROVADO', aprovadoEm: new Date().toISOString() },
      },
    });

    return { message: 'Cliente cadastrado com sucesso', clienteId: user.clientProfile!.id, userId: user.id };
  }
}
