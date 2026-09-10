import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { RagService } from '../knowledge/rag.service';
import { KnowledgeFaqService } from '../knowledge/knowledge-faq.service';
import * as bcrypt from 'bcrypt';

const AREA_TO_ENUM: Record<string, string> = {
  trabalhista: 'TRABALHISTA',
  civil: 'CIVIL',
  penal: 'PENAL',
  familia: 'FAMILIA',
  tributario: 'TRIBUTARIO',
  previdenciario: 'PREVIDENCIARIO',
  administrativo: 'ADMINISTRATIVO',
  empresarial: 'EMPRESARIAL',
  consumidor: 'CONSUMIDOR',
  ambiental: 'AMBIENTAL',
  outro: 'OUTRO',
};

function mapAreaToEnum(area?: string | null): string | null {
  if (!area) return null;
  const normalized = area
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return AREA_TO_ENUM[normalized] || null;
}

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
    private rag: RagService,
    private faqService: KnowledgeFaqService,
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
    let parsed: any = null;

    if (this.chatbot.isConfigured) {
      try {
        const response = await this.chatbot.triagem([
          { role: 'user', content: `${TRIAGEM_CLASSIFICACAO_PROMPT}\n\nMensagem do cliente:\n${mensagem}` },
        ]);

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

    await this.posTriagem(atendimentoId, parsed?.urgencia ?? 0, parsed?.area ?? null);
  }

  private async posTriagem(atendimentoId: string, urgencia: number, areaDetectada: string | null) {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id: atendimentoId },
      select: { id: true, responsavelId: true, status: true },
    });
    if (!atendimento) return;

    const escritorio = await this.prisma.escritorio.findFirst({
      select: { autoAtribuicaoAtiva: true },
    });

    let advogado: { id: string; name: string } | null = null;

    if (escritorio?.autoAtribuicaoAtiva && !atendimento.responsavelId) {
      advogado = await this.escolherAdvogadoPorEspecialidade(areaDetectada);
      if (advogado) {
        await this.prisma.atendimento.update({
          where: { id: atendimentoId },
          data: {
            responsavelId: advogado.id,
            status: 'EM_ATENDIMENTO',
          },
        });
        await this.prisma.notification.create({
          data: {
            userId: advogado.id,
            title: 'Novo atendimento atribuído',
            message: `Você recebeu um novo atendimento${areaDetectada ? ` na área ${areaDetectada}` : ''}.`,
            type: 'ATENDIMENTO_ATRIBUIDO',
            data: { atendimentoId, urgencia, areaDetectada },
          },
        });
      } else {
        await this.notificarAdminsAtendimento(atendimentoId, 'ATENDIMENTO_NAO_ATRIBUIDO', 'Atendimento sem advogado especialista', `Nenhum advogado com especialidade ${areaDetectada || 'compatível'} disponível.`);
      }
    }

    if (urgencia >= 8) {
      await this.notificarUrgencia(atendimentoId, urgencia, areaDetectada, advogado?.id);
    }
  }

  private async escolherAdvogadoPorEspecialidade(areaDetectada: string | null) {
    const areaEnum = mapAreaToEnum(areaDetectada);

    const candidatos = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['ADVOGADO', 'ADMIN'] },
        ...(areaEnum ? { especialidades: { has: areaEnum } } : {}),
      },
      select: { id: true, name: true, especialidades: true },
    });

    if (candidatos.length === 0) return null;

    const cargas = await this.prisma.atendimento.groupBy({
      by: ['responsavelId'],
      where: {
        responsavelId: { in: candidatos.map(c => c.id) },
        status: { in: ['NOVO', 'EM_ATENDIMENTO', 'EM_ANALISE'] },
      },
      _count: { _all: true },
    });

    const cargaPorAdv = new Map<string, number>();
    cargas.forEach(c => {
      if (c.responsavelId) cargaPorAdv.set(c.responsavelId, c._count._all);
    });

    candidatos.sort((a, b) => (cargaPorAdv.get(a.id) || 0) - (cargaPorAdv.get(b.id) || 0));

    return candidatos[0] || null;
  }

  private async notificarAdminsAtendimento(atendimentoId: string, type: string, title: string, message: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    await Promise.all(
      admins.map(a =>
        this.prisma.notification.create({
          data: { userId: a.id, title, message, type, data: { atendimentoId } },
        }),
      ),
    );
  }

  private async notificarUrgencia(atendimentoId: string, urgencia: number, areaDetectada: string | null, exceptUserId?: string) {
    const areaEnum = mapAreaToEnum(areaDetectada);
    const destinatarios = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'ADMIN' },
          ...(areaEnum
            ? [{ role: 'ADVOGADO' as const, especialidades: { has: areaEnum } }]
            : [{ role: 'ADVOGADO' as const }]),
        ],
      },
      select: { id: true },
    });

    await Promise.all(
      destinatarios
        .filter(d => d.id !== exceptUserId)
        .map(d =>
          this.prisma.notification.create({
            data: {
              userId: d.id,
              title: 'Atendimento URGENTE',
              message: `Atendimento com urgência ${urgencia}/10${areaDetectada ? ` (${areaDetectada})` : ''} aguardando análise.`,
              type: 'ATENDIMENTO_URGENTE',
              data: { atendimentoId, urgencia, areaDetectada },
            },
          }),
        ),
    );
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
    const atendimento = await this.findById(id);

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
        slaFirstResponseAt: atendimento.slaFirstResponseAt ?? new Date(),
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

    const faqBlock = await this.faqService.formatForContext();
    const ragHint = await this.rag.generateReply(
      `${atendimento.mensagemOriginal}\n${historico}`,
    );

    const context = `${SUGESTAO_RESPOSTA_PROMPT}

TRIAGEM:
- Área: ${atendimento.areaDetectada || 'não classificada'}
- Urgência: ${atendimento.urgencia}/10
- Complexidade: ${atendimento.complexidade || 'não avaliada'}

${faqBlock ? `FAQs DO ESCRITÓRIO:\n${faqBlock}\n` : ''}
${ragHint ? `SUGESTÃO BASEADA NA BASE DE CONHECIMENTO (refine, não copie literalmente):\n${ragHint}\n` : ''}

HISTÓRICO:
${historico}

Gere uma resposta profissional para enviar ao cliente:`;

    const reply = await this.chatbot.triagem([{ role: 'user', content: context }], SUGESTAO_RESPOSTA_PROMPT);

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
    const [novos, emAtendimento, respondidos, emAnalise, convertidos, perdidos, total] =
      await Promise.all([
        this.prisma.atendimento.count({ where: { status: 'NOVO' } }),
        this.prisma.atendimento.count({ where: { status: 'EM_ATENDIMENTO' } }),
        this.prisma.atendimento.count({ where: { status: 'RESPONDIDO' } }),
        this.prisma.atendimento.count({ where: { status: 'EM_ANALISE' } }),
        this.prisma.atendimento.count({ where: { status: 'CONVERTIDO' } }),
        this.prisma.atendimento.count({ where: { status: 'PERDIDO' } }),
        this.prisma.atendimento.count(),
      ]);
    return { novos, emAtendimento, respondidos, emAnalise, convertidos, perdidos, total };
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

  async promoverLead(
    id: string,
    data: { nome: string; email: string; cpf?: string; telefone?: string },
  ): Promise<any> {
    const atendimento = await this.findById(id);

    if (atendimento.clienteId) {
      throw new BadRequestException('Atendimento já possui cliente vinculado');
    }
    if (!data.nome?.trim() || !data.email?.trim()) {
      throw new BadRequestException('Nome e email são obrigatórios');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestException('Já existe um usuário com este email');
    }

    const tempPassword = await bcrypt.hash('mudar@123', 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.nome,
        password: tempPassword,
        role: 'CLIENTE',
        phone: data.telefone || atendimento.telefone || undefined,
        clientProfile: {
          create: {
            cpfCnpj: data.cpf || null,
            leadSource: atendimento.canal?.toLowerCase() || 'manual',
            consentLgpd: true,
            consentDate: new Date(),
          },
        },
      },
      include: { clientProfile: true },
    });

    await this.prisma.atendimento.update({
      where: { id },
      data: { clienteId: user.clientProfile!.id },
    });

    return {
      message: 'Cliente cadastrado e vinculado',
      clienteId: user.clientProfile!.id,
      userId: user.id,
    };
  }

  async marcarPerdido(id: string, motivo: string): Promise<any> {
    if (!motivo?.trim()) {
      throw new BadRequestException('Motivo é obrigatório');
    }
    await this.findById(id);
    return this.prisma.atendimento.update({
      where: { id },
      data: { status: 'PERDIDO', motivoPerda: motivo.trim() },
    });
  }

  async converterEmProcesso(
    id: string,
    userId: string,
    data: {
      numero: string;
      tribunal: string;
      vara?: string;
      comarca?: string;
      area?: string;
      valorCausa?: number;
      advogadoId?: string;
      descricao?: string;
    },
  ): Promise<any> {
    const atendimento = await this.findById(id);

    if (atendimento.status === 'CONVERTIDO' && atendimento.processoId) {
      throw new BadRequestException('Atendimento já foi convertido em processo');
    }
    if (!atendimento.clienteId) {
      throw new BadRequestException(
        'Vincule um cliente ao atendimento antes de convertê-lo em processo',
      );
    }
    if (!data.numero?.trim() || !data.tribunal?.trim()) {
      throw new BadRequestException('Número CNJ e tribunal são obrigatórios');
    }

    const advogadoId = data.advogadoId || atendimento.responsavelId;
    if (!advogadoId) {
      throw new BadRequestException(
        'Atribua um advogado ao atendimento ou informe advogadoId',
      );
    }

    const numeroExistente = await this.prisma.processo.findUnique({
      where: { numero: data.numero.trim() },
    });
    if (numeroExistente) {
      throw new BadRequestException('Já existe processo com esse número CNJ');
    }

    const areaEnum =
      mapAreaToEnum(data.area) || mapAreaToEnum(atendimento.areaDetectada) || 'OUTRO';

    const descricao =
      data.descricao?.trim() ||
      (atendimento.mensagemOriginal as string)?.slice(0, 500) ||
      undefined;

    const valorCausa =
      typeof data.valorCausa === 'number'
        ? data.valorCausa
        : atendimento.valorEstimado
          ? Number(atendimento.valorEstimado)
          : undefined;

    const dataLimiteTarefa = new Date();
    dataLimiteTarefa.setDate(dataLimiteTarefa.getDate() + 2);

    const result = await this.prisma.$transaction(async (tx) => {
      const processo = await tx.processo.create({
        data: {
          numero: data.numero.trim(),
          tribunal: data.tribunal.trim(),
          vara: data.vara?.trim() || null,
          comarca: data.comarca?.trim() || null,
          area: areaEnum as any,
          status: 'ATIVO',
          valorCausa: valorCausa ?? undefined,
          descricao,
          advogadoId,
          clienteId: atendimento.clienteId,
        },
      });

      const updatedAtendimento = await tx.atendimento.update({
        where: { id },
        data: {
          status: 'CONVERTIDO',
          processoId: processo.id,
          responsavelId: advogadoId,
        },
      });

      const tarefa = await tx.tarefa.create({
        data: {
          processoId: processo.id,
          responsavelId: advogadoId,
          titulo: `Revisar caso convertido do atendimento #${id.slice(-6)}`,
          descricao: `Atendimento ${atendimento.canal} de ${atendimento.nome}. Mensagem original: ${(atendimento.mensagemOriginal as string)?.slice(0, 240)}`,
          prioridade: 'ALTA',
          status: 'PENDENTE',
          dataLimite: dataLimiteTarefa,
        },
      });

      await tx.notification.create({
        data: {
          userId: advogadoId,
          title: 'Novo caso convertido de atendimento',
          message: `Processo ${processo.numero} criado a partir de atendimento. Tarefa de revisão criada.`,
          type: 'PROCESSO_CRIADO_VIA_ATENDIMENTO',
          data: { atendimentoId: id, processoId: processo.id, tarefaId: tarefa.id },
        },
      });

      return { processo, atendimento: updatedAtendimento, tarefa };
    });

    void userId;
    return result;
  }
}
