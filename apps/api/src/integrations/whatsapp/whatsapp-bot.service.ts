import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatbotService } from '../../chatbot/chatbot.service';
import { WhatsappService } from './whatsapp.service';
import { AtendimentoService } from '../../atendimento/atendimento.service';

const INTENT_PROMPT = `Você é um roteador de mensagens de um escritório de advocacia brasileiro.
Analise a mensagem do cliente e o contexto fornecido. Retorne APENAS um JSON válido (sem markdown, sem texto extra):
{
  "intencao": "saudacao|triagem|consulta_processo|cadastro|duvida_geral|outro",
  "dados_extraidos": { "nome": null, "cpf": null, "email": null, "numero_processo": null }
}

Regras:
- "saudacao": mensagens como "oi", "olá", "bom dia", "boa tarde", números de menu (1,2,3,4)
- "triagem": quando o cliente descreve um problema jurídico ou pede ajuda com um caso
- "consulta_processo": quando pede status, andamento ou informações de processo
- "cadastro": quando quer se cadastrar, criar conta, ser cliente
- "duvida_geral": perguntas gerais sobre o escritório, horários, valores
- Se a mensagem for um número (1,2,3,4), trate como escolha de menu`;

const TRIAGEM_RESPOSTA_PROMPT = `Você é o assistente virtual de um escritório de advocacia brasileiro.
O cliente acabou de descrever uma situação jurídica. Com base na triagem feita, elabore uma resposta curta (máx 300 caracteres) para WhatsApp:
- Demonstre que entendeu o caso
- Informe a área do direito identificada
- Diga que um advogado será notificado
- Tom profissional mas acolhedor
- NÃO dê parecer jurídico`;

@Injectable()
export class WhatsappBotService {
  constructor(
    private prisma: PrismaService,
    private chatbot: ChatbotService,
    private whatsapp: WhatsappService,
    private atendimentoService: AtendimentoService,
  ) {}

  async handle(telefone: string, texto: string, nomeContato?: string) {
    const atendimentoAberto = await this.prisma.atendimento.findFirst({
      where: {
        telefone,
        canal: 'WHATSAPP',
        status: { in: ['NOVO', 'EM_ATENDIMENTO', 'RESPONDIDO'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (atendimentoAberto?.etapaBot) {
      return this.handleBotFlow(atendimentoAberto, texto);
    }

    if (atendimentoAberto) {
      await this.prisma.atendimentoMensagem.create({
        data: {
          atendimentoId: atendimentoAberto.id,
          remetente: 'CLIENTE',
          conteudo: texto,
          enviadaVia: 'WHATSAPP',
        },
      });
      if (atendimentoAberto.status === 'RESPONDIDO') {
        await this.prisma.atendimento.update({
          where: { id: atendimentoAberto.id },
          data: { status: 'EM_ATENDIMENTO' },
        });
      }
      return;
    }

    return this.handleFirstContact(telefone, texto, nomeContato);
  }

  private async handleFirstContact(telefone: string, texto: string, nomeContato?: string) {
    const nome = nomeContato || telefone;
    const escritorio = await this.prisma.escritorio.findFirst({
      select: { nomeFantasia: true, razaoSocial: true },
    });
    const nomeEscritorio = escritorio?.nomeFantasia || escritorio?.razaoSocial || 'nosso escritório';

    const atendimento = await this.atendimentoService.create({
      nome,
      telefone,
      canal: 'WHATSAPP',
      mensagem: texto,
    });

    const intent = await this.detectIntent(texto);

    if (intent === 'consulta_processo') {
      await this.prisma.atendimento.update({
        where: { id: atendimento.id },
        data: { etapaBot: 'CONSULTA_IDENTIFICACAO' },
      });
      return this.handleConsultaStart(atendimento.id, telefone);
    }

    if (intent === 'cadastro') {
      await this.prisma.atendimento.update({
        where: { id: atendimento.id },
        data: { etapaBot: 'CADASTRO_NOME' },
      });
      await this.sendWA(telefone, `Olá! Vou iniciar seu pré-cadastro em ${nomeEscritorio}.\n\nPor favor, informe seu *nome completo*:`);
      return;
    }

    if (intent === 'triagem') {
      return this.handleTriagem(atendimento.id, telefone, texto);
    }

    const menu = `Olá${nome !== telefone ? ', ' + nome.split(' ')[0] : ''}! Sou o assistente virtual de ${nomeEscritorio}. Como posso ajudá-lo?\n\n` +
      `*1* - Tenho uma dúvida jurídica\n` +
      `*2* - Quero consultar meu processo\n` +
      `*3* - Quero me cadastrar como cliente\n` +
      `*4* - Falar com um advogado`;

    await this.prisma.atendimento.update({
      where: { id: atendimento.id },
      data: { etapaBot: 'MENU' },
    });

    await this.sendWA(telefone, menu);
  }

  private async handleBotFlow(atendimento: any, texto: string) {
    const id = atendimento.id;
    const telefone = atendimento.telefone;

    await this.prisma.atendimentoMensagem.create({
      data: { atendimentoId: id, remetente: 'CLIENTE', conteudo: texto, enviadaVia: 'WHATSAPP' },
    });

    const etapa = atendimento.etapaBot;

    if (etapa === 'MENU') {
      return this.handleMenuChoice(id, telefone, texto.trim());
    }

    if (etapa?.startsWith('CADASTRO_')) {
      return this.handleCadastroFlow(id, telefone, texto.trim(), etapa, atendimento.dadosBot || {});
    }

    if (etapa?.startsWith('CONSULTA_')) {
      return this.handleConsultaFlow(id, telefone, texto.trim(), etapa);
    }
  }

  private async handleMenuChoice(id: string, telefone: string, escolha: string) {
    switch (escolha) {
      case '1': {
        await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: null } });
        await this.sendWA(telefone, 'Por favor, descreva brevemente sua situação jurídica. Vou analisar e encaminhar para um de nossos advogados.');
        return;
      }
      case '2': {
        await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: 'CONSULTA_IDENTIFICACAO' } });
        return this.handleConsultaStart(id, telefone);
      }
      case '3': {
        await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: 'CADASTRO_NOME' } });
        await this.sendWA(telefone, 'Vou iniciar seu pré-cadastro.\n\nPor favor, informe seu *nome completo*:');
        return;
      }
      case '4': {
        await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: null } });
        await this.sendWA(telefone, 'Um de nossos advogados será notificado e entrará em contato com você em breve. Enquanto isso, fique à vontade para descrever sua dúvida.');
        return;
      }
      default: {
        const intent = await this.detectIntent(escolha);
        if (intent === 'triagem') {
          await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: null } });
          return this.handleTriagem(id, telefone, escolha);
        }
        await this.sendWA(telefone, 'Por favor, escolha uma opção:\n*1* - Dúvida jurídica\n*2* - Consultar processo\n*3* - Cadastrar-se\n*4* - Falar com advogado');
      }
    }
  }

  private async handleTriagem(atendimentoId: string, telefone: string, mensagem: string) {
    await this.prisma.atendimento.update({
      where: { id: atendimentoId },
      data: { etapaBot: null },
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id: atendimentoId },
      select: { areaDetectada: true, urgencia: true, complexidade: true },
    });

    if (atendimento?.areaDetectada && this.chatbot.isConfigured) {
      try {
        const resposta = await this.chatbot.triagem([{
          role: 'user',
          content: `${TRIAGEM_RESPOSTA_PROMPT}\n\nÁrea detectada: ${atendimento.areaDetectada}\nUrgência: ${atendimento.urgencia}/10\nMensagem do cliente: ${mensagem}\n\nGere a resposta curta:`,
        }]);
        await this.sendWA(telefone, resposta);
      } catch {
        await this.sendWA(telefone, `Recebemos sua mensagem e um advogado foi notificado. Entraremos em contato em breve.`);
      }
    } else {
      await this.sendWA(telefone, `Recebemos sua mensagem e um advogado foi notificado. Entraremos em contato em breve.`);
    }

    await this.saveBotMessage(atendimentoId, 'Triagem realizada e advogado notificado.');
  }

  private async handleCadastroFlow(id: string, telefone: string, texto: string, etapa: string, dados: any) {
    if (etapa === 'CADASTRO_NOME') {
      const updated = { ...dados, nome: texto };
      await this.prisma.atendimento.update({
        where: { id },
        data: { dadosBot: updated, etapaBot: 'CADASTRO_CPF', nome: texto },
      });
      await this.sendWA(telefone, `Obrigado, ${texto.split(' ')[0]}!\n\nAgora informe seu *CPF* (apenas números):`);
      return;
    }

    if (etapa === 'CADASTRO_CPF') {
      const cpfClean = texto.replace(/\D/g, '');
      if (cpfClean.length < 11) {
        await this.sendWA(telefone, 'CPF inválido. Por favor, informe os 11 dígitos do seu CPF:');
        return;
      }
      const formatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const updated = { ...dados, cpf: formatted };
      await this.prisma.atendimento.update({
        where: { id },
        data: { dadosBot: updated, etapaBot: 'CADASTRO_EMAIL' },
      });
      await this.sendWA(telefone, 'Agora informe seu *email*:');
      return;
    }

    if (etapa === 'CADASTRO_EMAIL') {
      if (!texto.includes('@')) {
        await this.sendWA(telefone, 'Email inválido. Por favor, informe um email válido:');
        return;
      }
      const updated = { ...dados, email: texto.toLowerCase().trim(), telefone, status: 'AGUARDANDO_APROVACAO' };
      await this.prisma.atendimento.update({
        where: { id },
        data: { dadosBot: updated, etapaBot: 'CADASTRO_PENDENTE' },
      });

      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'ADVOGADO'] }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Novo pré-cadastro via WhatsApp',
            message: `${updated.nome} (${updated.cpf}) solicita cadastro. Acesse Atendimentos para aprovar.`,
            type: 'CADASTRO_PENDENTE',
            data: { atendimentoId: id },
          },
        });
      }

      await this.sendWA(telefone, `Seus dados foram recebidos com sucesso!\n\n*Nome:* ${updated.nome}\n*CPF:* ${updated.cpf}\n*Email:* ${updated.email}\n\nUm advogado irá revisar e confirmar seu cadastro em breve.`);
      return;
    }
  }

  private async handleConsultaStart(id: string, telefone: string) {
    const client = await this.findClientByPhone(telefone);

    if (client) {
      await this.prisma.atendimento.update({
        where: { id },
        data: { clienteId: client.id, etapaBot: 'CONSULTA_LISTA' },
      });
      return this.showProcessos(id, telefone, client.id);
    }

    await this.sendWA(telefone, 'Para consultar seus processos, preciso identificar seu cadastro.\n\nPor favor, informe seu *CPF*:');
  }

  private async handleConsultaFlow(id: string, telefone: string, texto: string, etapa: string) {
    if (etapa === 'CONSULTA_IDENTIFICACAO') {
      const cpfClean = texto.replace(/\D/g, '');
      if (cpfClean.length < 11) {
        await this.sendWA(telefone, 'CPF inválido. Informe os 11 dígitos:');
        return;
      }
      const formatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

      const client = await this.prisma.client.findUnique({
        where: { cpfCnpj: formatted },
        select: { id: true },
      });

      if (!client) {
        await this.prisma.atendimento.update({ where: { id }, data: { etapaBot: null } });
        await this.sendWA(telefone, 'Não encontramos cadastro com esse CPF.\n\nDeseja se cadastrar? Envie *3* para iniciar o cadastro.');
        return;
      }

      await this.prisma.atendimento.update({
        where: { id },
        data: { clienteId: client.id, etapaBot: 'CONSULTA_LISTA' },
      });
      return this.showProcessos(id, telefone, client.id);
    }

    if (etapa === 'CONSULTA_LISTA') {
      const num = parseInt(texto);
      if (isNaN(num)) {
        await this.sendWA(telefone, 'Por favor, envie o *número* do processo que deseja consultar.');
        return;
      }
      return this.showProcessoDetail(id, telefone, num);
    }
  }

  private async showProcessos(atendimentoId: string, telefone: string, clienteId: string) {
    const processos = await this.prisma.processo.findMany({
      where: { clienteId },
      select: { id: true, numero: true, area: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (processos.length === 0) {
      await this.prisma.atendimento.update({ where: { id: atendimentoId }, data: { etapaBot: null } });
      await this.sendWA(telefone, 'Você não possui processos registrados no momento.');
      return;
    }

    if (processos.length === 1) {
      await this.prisma.atendimento.update({
        where: { id: atendimentoId },
        data: { dadosBot: { processos: processos.map(p => p.id) } },
      });
      return this.showProcessoDetail(atendimentoId, telefone, 1);
    }

    let msg = '*Seus processos:*\n\n';
    processos.forEach((p, i) => {
      msg += `*${i + 1}* - ${p.numero}\n  ${p.area} | ${p.status}\n\n`;
    });
    msg += 'Envie o *número* para ver detalhes.';

    await this.prisma.atendimento.update({
      where: { id: atendimentoId },
      data: { dadosBot: { processos: processos.map(p => p.id) } },
    });
    await this.sendWA(telefone, msg);
  }

  private async showProcessoDetail(atendimentoId: string, telefone: string, index: number) {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id: atendimentoId },
      select: { dadosBot: true, clienteId: true },
    });

    const processosIds = (atendimento?.dadosBot as any)?.processos || [];
    const processoId = processosIds[index - 1];

    if (!processoId) {
      const processos = await this.prisma.processo.findMany({
        where: { clienteId: atendimento?.clienteId || '' },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
      const pid = processos[index - 1]?.id;
      if (!pid) {
        await this.sendWA(telefone, 'Processo não encontrado. Tente novamente.');
        return;
      }
      return this.sendProcessoInfo(atendimentoId, telefone, pid);
    }

    return this.sendProcessoInfo(atendimentoId, telefone, processoId);
  }

  private async sendProcessoInfo(atendimentoId: string, telefone: string, processoId: string) {
    const processo = await this.prisma.processo.findUnique({
      where: { id: processoId },
      include: {
        advogado: { select: { name: true } },
        movimentacoes: { orderBy: { data: 'desc' }, take: 3 },
        prazos: {
          where: { status: 'PENDENTE' },
          orderBy: { dataLimite: 'asc' },
          take: 3,
        },
      },
    });

    if (!processo) {
      await this.sendWA(telefone, 'Processo não encontrado.');
      return;
    }

    const formatDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR');

    let msg = `*Processo: ${processo.numero}*\n`;
    msg += `Status: ${processo.status}\n`;
    msg += `Área: ${processo.area}\n`;
    msg += `Advogado: ${processo.advogado?.name || '-'}\n`;

    if (processo.movimentacoes.length > 0) {
      msg += `\n*Últimas movimentações:*\n`;
      processo.movimentacoes.forEach(m => {
        msg += `- ${formatDate(m.data)}: ${m.descricao}\n`;
      });
    }

    if (processo.prazos.length > 0) {
      msg += `\n*Próximos prazos:*\n`;
      processo.prazos.forEach(p => {
        const dias = Math.ceil((new Date(p.dataLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        msg += `- ${formatDate(p.dataLimite)}: ${p.descricao} (${dias}d)\n`;
      });
    }

    msg += `\n_Qualquer dúvida, responda esta mensagem._`;

    await this.prisma.atendimento.update({
      where: { id: atendimentoId },
      data: { etapaBot: null },
    });

    await this.sendWA(telefone, msg);
  }

  private async detectIntent(texto: string): Promise<string> {
    const lower = texto.toLowerCase().trim();

    if (['1', '2', '3', '4'].includes(lower)) return 'saudacao';
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello|hi)\b/i.test(lower)) return 'saudacao';
    if (/\b(processo|andamento|status|consulta|meu caso)\b/i.test(lower)) return 'consulta_processo';
    if (/\b(cadastr|registr|me inscrever|ser cliente|quero ser)\b/i.test(lower)) return 'cadastro';

    if (!this.chatbot.isConfigured) return 'triagem';

    try {
      const response = await this.chatbot.triagem([{
        role: 'user',
        content: `${INTENT_PROMPT}\n\nMensagem do cliente: "${texto}"`,
      }]);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed.intencao || 'triagem';
      }
    } catch {}

    return 'triagem';
  }

  private async findClientByPhone(telefone: string) {
    const phoneVariants = [telefone];
    if (telefone.startsWith('55')) {
      phoneVariants.push('+' + telefone);
      phoneVariants.push(telefone.slice(2));
      phoneVariants.push('+55' + telefone.slice(2));
    }

    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
        role: 'CLIENTE',
        clientProfile: { isNot: null },
      },
      include: { clientProfile: true },
    });

    return user?.clientProfile || null;
  }

  private async sendWA(telefone: string, texto: string) {
    await this.whatsapp.sendMessage(telefone, texto);
    const atendimento = await this.prisma.atendimento.findFirst({
      where: { telefone, canal: 'WHATSAPP', status: { in: ['NOVO', 'EM_ATENDIMENTO', 'RESPONDIDO'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (atendimento) {
      await this.saveBotMessage(atendimento.id, texto);
    }
  }

  private async saveBotMessage(atendimentoId: string, conteudo: string) {
    await this.prisma.atendimentoMensagem.create({
      data: {
        atendimentoId,
        remetente: 'IA_SUGESTAO',
        conteudo,
        enviadaVia: 'WHATSAPP',
      },
    });
  }
}
