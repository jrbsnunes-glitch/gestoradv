import { Injectable, Logger } from '@nestjs/common';
import {
  MovimentacaoExterna,
  PrazoExterno,
  TribunalConnector,
} from '../interfaces/tribunal-connector.interface';
import { PrismaService } from '../../../prisma/prisma.service';

/** Aliases públicos DATAJUD — expandir conforme tribunais do escritório */
const TRIBUNAL_ALIASES: Record<string, string> = {
  TJSP: 'api_publica_tjsp',
  TJRJ: 'api_publica_tjrj',
  TJMG: 'api_publica_tjmg',
  TRF3: 'api_publica_trf3',
  STJ: 'api_publica_stj',
  TST: 'api_publica_tst',
};

@Injectable()
export class DatajudConnector implements TribunalConnector {
  readonly nome = 'DATAJUD';
  private readonly logger = new Logger(DatajudConnector.name);
  private readonly baseUrl = 'https://api-publica.datajud.cnj.jus.br';

  constructor(private prisma: PrismaService) {}

  suportaTribunal(tribunal: string): boolean {
    const key = tribunal.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return key in TRIBUNAL_ALIASES || key.startsWith('TJ') || key.startsWith('TRF');
  }

  private resolveAlias(tribunal?: string): string {
    if (!tribunal) return TRIBUNAL_ALIASES.TJSP;
    const key = tribunal.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return TRIBUNAL_ALIASES[key] || `api_publica_${key.toLowerCase()}`;
  }

  private async getApiKey(): Promise<string | null> {
    const esc = await this.prisma.escritorio.findFirst({ select: { datajudApiKey: true } });
    return esc?.datajudApiKey || process.env.DATAJUD_API_KEY || null;
  }

  private normalizeNumero(numero: string): string {
    return numero.replace(/\D/g, '');
  }

  async buscarMovimentacoes(numeroProcesso: string, tribunal?: string): Promise<MovimentacaoExterna[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('DATAJUD API key não configurada');
      return [];
    }

    const alias = this.resolveAlias(tribunal);
    const numero = this.normalizeNumero(numeroProcesso);

    try {
      const response = await fetch(`${this.baseUrl}/${alias}/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `APIKey ${apiKey}`,
        },
        body: JSON.stringify({
          query: {
            match: {
              numeroProcesso: numero,
            },
          },
          size: 1,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`DATAJUD ${alias} HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as {
        hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
      };

      const source = data.hits?.hits?.[0]?._source;
      if (!source) return [];

      const movs = (source.movimentos as Array<Record<string, unknown>>) || [];
      return movs.slice(0, 20).map((m) => ({
        descricao: String(m.nome || m.descricao || 'Movimentação'),
        data: m.dataHora ? new Date(String(m.dataHora)) : new Date(),
        tipo: String(m.codigo || m.tipo || ''),
        origem: 'DATAJUD',
      }));
    } catch (err: any) {
      this.logger.warn(`DATAJUD erro: ${err.message}`);
      return [];
    }
  }

  async buscarPrazos(numeroProcesso: string, tribunal?: string): Promise<PrazoExterno[]> {
    const movimentacoes = await this.buscarMovimentacoes(numeroProcesso, tribunal);
    const prazos: PrazoExterno[] = [];

    for (const mov of movimentacoes) {
      const lower = mov.descricao.toLowerCase();
      if (
        lower.includes('prazo') ||
        lower.includes('intimação') ||
        lower.includes('intimacao') ||
        lower.includes('citação') ||
        lower.includes('citacao')
      ) {
        const dataLimite = new Date(mov.data);
        dataLimite.setDate(dataLimite.getDate() + 15);
        prazos.push({
          descricao: mov.descricao,
          dataLimite,
          origem: 'DATAJUD',
          urgencia: 'MEDIA',
        });
      }
    }

    return prazos;
  }
}
