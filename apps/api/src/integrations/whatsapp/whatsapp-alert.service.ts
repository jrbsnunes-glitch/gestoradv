import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';

interface AlertPrefs {
  inapp: boolean;
  email: boolean;
  whatsapp: boolean;
}

@Injectable()
export class WhatsappAlertService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private emailService: EmailService,
    private notifications: NotificationsService,
  ) {}

  private getPrefs(user: any): AlertPrefs {
    const raw = user.preferenciasAlerta;
    if (raw && typeof raw === 'object') return raw as AlertPrefs;
    return { inapp: true, email: true, whatsapp: true };
  }

  async alertarAdvogadoPrazo(prazo: {
    id: string;
    descricao: string;
    dataLimite: Date;
    processo: {
      id: string;
      numero: string;
      advogado: { id: string; name: string; email: string; phone?: string | null; preferenciasAlerta?: any };
    };
  }, diasRestantes: number) {
    const advogado = prazo.processo.advogado;
    const prefs = this.getPrefs(advogado);

    const label = diasRestantes === 0 ? 'hoje' : diasRestantes === 1 ? 'amanhã' : `em ${diasRestantes} dias`;

    if (prefs.inapp) {
      await this.notifications.create(advogado.id, {
        title: `Prazo vence ${label}`,
        message: `${prazo.descricao} - Processo ${prazo.processo.numero}`,
        type: `PRAZO_${diasRestantes}D`,
        data: { prazoId: prazo.id, processoId: prazo.processo.id },
      });
    }

    if (prefs.email && advogado.email) {
      try {
        await this.emailService.sendPrazoAlert(advogado.email, {
          advogadoName: advogado.name,
          processoNumero: prazo.processo.numero,
          prazoDescricao: prazo.descricao,
          dataLimite: new Date(prazo.dataLimite).toLocaleDateString('pt-BR'),
          diasRestantes,
        });
      } catch (err: any) {
        console.error(`[Alert] Email falhou para ${advogado.email}: ${err.message}`);
      }
    }

    if (prefs.whatsapp && advogado.phone) {
      const msg = `*Alerta de Prazo - GestorAdv*\n\n` +
        `Prazo vence ${label}:\n` +
        `*Processo:* ${prazo.processo.numero}\n` +
        `*Descrição:* ${prazo.descricao}\n` +
        `*Data limite:* ${new Date(prazo.dataLimite).toLocaleDateString('pt-BR')}\n\n` +
        `Acesse o sistema para detalhes.`;
      try {
        await this.whatsapp.sendMessage(advogado.phone, msg);
      } catch (err: any) {
        console.error(`[Alert] WhatsApp falhou para ${advogado.phone}: ${err.message}`);
      }
    }
  }

  async alertarClientePrazo(prazo: {
    descricao: string;
    dataLimite: Date;
    processo: {
      numero: string;
      cliente: { user: { name: string; phone?: string | null } } | null;
    };
  }, diasRestantes: number) {
    const cliente = prazo.processo.cliente;
    if (!cliente?.user?.phone) return;

    const label = diasRestantes === 0 ? 'hoje' : diasRestantes === 1 ? 'amanhã' : `em ${diasRestantes} dias`;
    const nome = cliente.user.name.split(' ')[0];

    const msg = `Olá ${nome}, temos uma atualização sobre seu processo *${prazo.processo.numero}*:\n\n` +
      `Há um prazo importante ${label}: ${prazo.descricao}.\n` +
      `Seu advogado está acompanhando.\n\n` +
      `_Qualquer dúvida, responda esta mensagem._`;

    try {
      await this.whatsapp.sendMessage(cliente.user.phone, msg);
    } catch (err: any) {
      console.error(`[Alert] WhatsApp cliente falhou: ${err.message}`);
    }
  }

  async alertarAdvogadoTarefa(tarefa: {
    id: string;
    titulo: string;
    descricao?: string | null;
    dataLimite: Date;
    processo?: { id: string; numero: string } | null;
    responsavel: { id: string; name: string; email: string; phone?: string | null; preferenciasAlerta?: any };
  }, diasRestantes: number) {
    const advogado = tarefa.responsavel;
    const prefs = this.getPrefs(advogado);

    const label = diasRestantes === 0 ? 'hoje' : diasRestantes === 1 ? 'amanhã' : `em ${diasRestantes} dias`;
    const processoInfo = tarefa.processo ? ` - Processo ${tarefa.processo.numero}` : '';

    if (prefs.inapp) {
      await this.notifications.create(advogado.id, {
        title: `Tarefa vence ${label}`,
        message: `${tarefa.titulo}${processoInfo}`,
        type: `TAREFA_${diasRestantes}D`,
        data: { tarefaId: tarefa.id, processoId: tarefa.processo?.id },
      });
    }

    if (prefs.email && advogado.email) {
      try {
        await this.emailService.sendPrazoAlert(advogado.email, {
          advogadoName: advogado.name,
          processoNumero: tarefa.processo?.numero || 'Sem processo',
          prazoDescricao: `Tarefa: ${tarefa.titulo}`,
          dataLimite: new Date(tarefa.dataLimite).toLocaleDateString('pt-BR'),
          diasRestantes,
        });
      } catch (err: any) {
        console.error(`[Alert] Email tarefa falhou para ${advogado.email}: ${err.message}`);
      }
    }

    if (prefs.whatsapp && advogado.phone) {
      const msg = `*Alerta de Tarefa - GestorAdv*\n\n` +
        `Tarefa vence ${label}:\n` +
        `*Tarefa:* ${tarefa.titulo}\n` +
        (tarefa.processo ? `*Processo:* ${tarefa.processo.numero}\n` : '') +
        `*Data limite:* ${new Date(tarefa.dataLimite).toLocaleDateString('pt-BR')}\n\n` +
        `Acesse o sistema para detalhes.`;
      try {
        await this.whatsapp.sendMessage(advogado.phone, msg);
      } catch (err: any) {
        console.error(`[Alert] WhatsApp tarefa falhou para ${advogado.phone}: ${err.message}`);
      }
    }
  }

  async alertarClienteMovimentacao(movimentacao: {
    descricao: string;
    data: Date;
    processo: {
      numero: string;
      cliente: { user: { name: string; phone?: string | null } } | null;
    };
  }) {
    const cliente = movimentacao.processo.cliente;
    if (!cliente?.user?.phone) return;

    const nome = cliente.user.name.split(' ')[0];
    const dataStr = new Date(movimentacao.data).toLocaleDateString('pt-BR');

    const msg = `Olá ${nome}, houve uma movimentação no seu processo *${movimentacao.processo.numero}*:\n\n` +
      `📋 ${movimentacao.descricao}\n` +
      `📅 ${dataStr}\n\n` +
      `_Qualquer dúvida, responda esta mensagem._`;

    try {
      await this.whatsapp.sendMessage(cliente.user.phone, msg);
    } catch (err: any) {
      console.error(`[Alert] WhatsApp movimentação falhou: ${err.message}`);
    }
  }
}
