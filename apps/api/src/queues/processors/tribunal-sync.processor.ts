import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { TribunaisService } from '../../integrations/tribunais/tribunais.service';

@Processor('tribunal-sync')
export class TribunalSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(TribunalSyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private tribunais: TribunaisService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const processos = await this.prisma.processo.findMany({
      where: { status: 'ATIVO' },
      select: { id: true, numero: true, tribunal: true },
      take: 50,
    });

    for (const proc of processos) {
      try {
        const movs = await this.tribunais.buscarMovimentacoes(proc.numero, proc.tribunal);
        for (const mov of movs.slice(0, 5)) {
          const exists = await this.prisma.movimentacao.findFirst({
            where: {
              processoId: proc.id,
              descricao: mov.descricao,
              data: mov.data,
            },
          });
          if (!exists) {
            await this.prisma.movimentacao.create({
              data: {
                processoId: proc.id,
                descricao: mov.descricao,
                data: mov.data,
                tipo: mov.tipo || 'EXTERNA',
                fonte: mov.origem,
              },
            });
          }
        }

        const prazosExt = await this.tribunais.buscarPrazos(proc.numero, proc.tribunal);
        for (const pe of prazosExt) {
          const exists = await this.prisma.prazo.findFirst({
            where: {
              processoId: proc.id,
              descricao: pe.descricao,
              dataLimite: pe.dataLimite,
            },
          });
          if (!exists) {
            await this.prisma.prazo.create({
              data: {
                processoId: proc.id,
                descricao: `[Sugerido ${pe.origem}] ${pe.descricao}`,
                dataLimite: pe.dataLimite,
                urgencia: pe.urgencia === 'CRITICA' ? 'CRITICA' : pe.urgencia === 'ALTA' ? 'ALTA' : 'MEDIA',
                observacoes: 'Prazo sugerido automaticamente — confirme com advogado',
                status: 'PENDENTE',
              },
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Sync processo ${proc.numero}: ${err.message}`);
      }
    }

    this.logger.log(`Tribunal sync concluído para ${processos.length} processos`);
  }
}
