import { Injectable, Logger } from '@nestjs/common';
import { TribunalConnector, PrazoExterno, MovimentacaoExterna } from './interfaces/tribunal-connector.interface';
import { StubConnector } from './connectors/stub.connector';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TribunaisService {
  private readonly logger = new Logger(TribunaisService.name);
  private connectors: TribunalConnector[] = [];

  constructor(
    private stubConnector: StubConnector,
    private prisma: PrismaService,
  ) {
    this.connectors = [this.stubConnector];
  }

  async getCredenciais(): Promise<{ datajudApiKey: string | null; proxyUrl: string | null; twocaptchaApiKey: string | null }> {
    try {
      const escritorio = await this.prisma.escritorio.findFirst({
        select: { datajudApiKey: true, proxyUrl: true, twocaptchaApiKey: true },
      });
      return {
        datajudApiKey: escritorio?.datajudApiKey || null,
        proxyUrl: escritorio?.proxyUrl || null,
        twocaptchaApiKey: escritorio?.twocaptchaApiKey || null,
      };
    } catch {
      return { datajudApiKey: null, proxyUrl: null, twocaptchaApiKey: null };
    }
  }

  registerConnector(connector: TribunalConnector) {
    this.connectors.push(connector);
    this.logger.log(`Connector registrado: ${connector.nome}`);
  }

  async buscarPrazos(numeroProcesso: string, tribunal?: string): Promise<PrazoExterno[]> {
    for (const connector of this.connectors) {
      if (tribunal && !connector.suportaTribunal(tribunal)) continue;

      try {
        const prazos = await connector.buscarPrazos(numeroProcesso);
        if (prazos.length > 0) {
          this.logger.log(`${connector.nome}: ${prazos.length} prazos encontrados para ${numeroProcesso}`);
          return prazos;
        }
      } catch (err: any) {
        this.logger.warn(`${connector.nome}: erro ao buscar prazos — ${err.message}`);
      }
    }

    return [];
  }

  async buscarMovimentacoes(numeroProcesso: string, tribunal?: string): Promise<MovimentacaoExterna[]> {
    for (const connector of this.connectors) {
      if (tribunal && !connector.suportaTribunal(tribunal)) continue;

      try {
        const movs = await connector.buscarMovimentacoes(numeroProcesso);
        if (movs.length > 0) {
          this.logger.log(`${connector.nome}: ${movs.length} movimentações encontradas para ${numeroProcesso}`);
          return movs;
        }
      } catch (err: any) {
        this.logger.warn(`${connector.nome}: erro ao buscar movimentações — ${err.message}`);
      }
    }

    return [];
  }

  getConnectorsDisponiveis(): string[] {
    return this.connectors.map((c) => c.nome);
  }
}
