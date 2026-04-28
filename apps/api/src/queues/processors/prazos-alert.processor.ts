import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappAlertService } from '../../integrations/whatsapp/whatsapp-alert.service';

@Processor('prazos-alerts')
export class PrazosAlertProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private alertService: WhatsappAlertService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'check-prazos') return;

    const now = new Date();
    const intervals = [
      { days: 1, label: 'amanhã' },
      { days: 3, label: 'em 3 dias' },
      { days: 7, label: 'em 7 dias' },
    ];

    let totalAlertas = 0;

    for (const interval of intervals) {
      const target = new Date(now);
      target.setDate(target.getDate() + interval.days);
      const dayStart = new Date(target);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(target);
      dayEnd.setHours(23, 59, 59, 999);

      // --- Alertas de Prazos ---
      const prazos = await this.prisma.prazo.findMany({
        where: {
          status: 'PENDENTE',
          alertas: true,
          alertaEnviadoEm: null,
          dataLimite: { gte: dayStart, lte: dayEnd },
        },
        include: {
          processo: {
            include: {
              advogado: {
                select: { id: true, name: true, email: true, phone: true, preferenciasAlerta: true },
              },
              cliente: {
                include: { user: { select: { name: true, phone: true } } },
              },
            },
          },
        },
      });

      for (const prazo of prazos) {
        if (!prazo.processo?.advogado) continue;

        try {
          await this.alertService.alertarAdvogadoPrazo(
            {
              id: prazo.id,
              descricao: prazo.descricao,
              dataLimite: prazo.dataLimite,
              processo: {
                id: prazo.processoId,
                numero: prazo.processo.numero,
                advogado: prazo.processo.advogado as any,
              },
            },
            interval.days,
          );

          if (prazo.processo.cliente) {
            await this.alertService.alertarClientePrazo(
              {
                descricao: prazo.descricao,
                dataLimite: prazo.dataLimite,
                processo: {
                  numero: prazo.processo.numero,
                  cliente: prazo.processo.cliente as any,
                },
              },
              interval.days,
            );
          }

          await this.prisma.prazo.update({
            where: { id: prazo.id },
            data: { alertaEnviadoEm: new Date() },
          });

          totalAlertas++;
        } catch (err: any) {
          console.error(`[PrazosAlert] Erro ao alertar prazo ${prazo.id}: ${err.message}`);
        }
      }

      // --- Alertas de Tarefas ---
      const tarefas = await this.prisma.tarefa.findMany({
        where: {
          status: { notIn: ['CONCLUIDA', 'CANCELADA'] },
          alertaEnviadoEm: null,
          dataLimite: { gte: dayStart, lte: dayEnd },
        },
        include: {
          processo: { select: { id: true, numero: true } },
          responsavel: {
            select: { id: true, name: true, email: true, phone: true, preferenciasAlerta: true },
          },
        },
      });

      for (const tarefa of tarefas) {
        try {
          await this.alertService.alertarAdvogadoTarefa(
            {
              id: tarefa.id,
              titulo: tarefa.titulo,
              descricao: tarefa.descricao,
              dataLimite: tarefa.dataLimite!,
              processo: tarefa.processo,
              responsavel: tarefa.responsavel as any,
            },
            interval.days,
          );

          await this.prisma.tarefa.update({
            where: { id: tarefa.id },
            data: { alertaEnviadoEm: new Date() },
          });

          totalAlertas++;
        } catch (err: any) {
          console.error(`[PrazosAlert] Erro ao alertar tarefa ${tarefa.id}: ${err.message}`);
        }
      }
    }

    console.log(`[PrazosAlert] Completado: ${totalAlertas} alertas enviados (${new Date().toISOString()})`);
  }
}
