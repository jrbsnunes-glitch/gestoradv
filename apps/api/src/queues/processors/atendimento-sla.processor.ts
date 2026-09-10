import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';

@Processor('atendimento-sla')
export class AtendimentoSlaProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'check-sla') return;

    const escritorio = await this.prisma.escritorio.findFirst({
      select: { slaPrimeiroToqueMinutos: true },
    });
    const slaMinutos = escritorio?.slaPrimeiroToqueMinutos ?? 30;

    const limite = new Date(Date.now() - slaMinutos * 60 * 1000);

    const violadores = await this.prisma.atendimento.findMany({
      where: {
        status: 'NOVO',
        responsavelId: null,
        slaFirstResponseAt: null,
        createdAt: { lt: limite },
      },
      select: {
        id: true,
        nome: true,
        canal: true,
        createdAt: true,
        urgencia: true,
        areaDetectada: true,
      },
    });

    if (violadores.length === 0) {
      console.log(`[AtendimentoSLA] Nenhuma violação (${new Date().toISOString()})`);
      return;
    }

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, phone: true },
    });

    let totalNotificacoes = 0;

    for (const at of violadores) {
      const minutosAtraso = Math.floor((Date.now() - at.createdAt.getTime()) / 60000);

      for (const admin of admins) {
        const existente = await this.prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: 'SLA_VIOLADO',
            data: { path: ['atendimentoId'], equals: at.id },
          },
          select: { id: true },
        });
        if (existente) continue;

        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'SLA de atendimento violado',
            message: `Atendimento de ${at.nome} (${at.canal}) sem resposta há ${minutosAtraso} min.`,
            type: 'SLA_VIOLADO',
            data: {
              atendimentoId: at.id,
              minutosAtraso,
              urgencia: at.urgencia,
              areaDetectada: at.areaDetectada,
            },
          },
        });

        if (admin.phone) {
          try {
            await this.whatsapp.sendMessage(
              admin.phone,
              `*GestorAdv* — SLA violado.\nAtendimento de ${at.nome} (${at.canal}) está há ${minutosAtraso} min sem resposta.`,
            );
          } catch {}
        }

        totalNotificacoes++;
      }
    }

    console.log(
      `[AtendimentoSLA] ${violadores.length} violações, ${totalNotificacoes} notificações (${new Date().toISOString()})`,
    );
  }
}
