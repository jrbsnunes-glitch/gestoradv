import { Injectable, Logger } from '@nestjs/common';
import {
  MovimentacaoExterna,
  PrazoExterno,
  TribunalConnector,
} from '../interfaces/tribunal-connector.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PlaywrightConnector implements TribunalConnector {
  readonly nome = 'Playwright';
  private readonly logger = new Logger(PlaywrightConnector.name);

  constructor(private prisma: PrismaService) {}

  suportaTribunal(tribunal: string): boolean {
    const t = tribunal.toUpperCase();
    return t.includes('TJ') || t.includes('TRT') || t.includes('TRF');
  }

  private async getProxyUrl(): Promise<string | undefined> {
    const esc = await this.prisma.escritorio.findFirst({ select: { proxyUrl: true } });
    return esc?.proxyUrl || process.env.PROXY_URL || undefined;
  }

  async buscarMovimentacoes(numeroProcesso: string, tribunal?: string): Promise<MovimentacaoExterna[]> {
    try {
      const { chromium } = await import('playwright');
      const proxyUrl = await this.getProxyUrl();
      const browser = await chromium.launch({
        headless: true,
        proxy: proxyUrl ? { server: proxyUrl } : undefined,
      });
      const page = await browser.newPage();
      const num = numeroProcesso.replace(/\D/g, '');
      const url = tribunal?.toUpperCase().includes('SP')
        ? `https://esaj.tjsp.jus.br/cpopg/show.do?processo.numero=${num}`
        : `https://projudi.tjpr.jus.br/projudi_consulta/publico/processos/ConsultaProcesso?numero=${num}`;

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table tr, .movimentacao'))
          .slice(0, 15)
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 15),
      );
      await browser.close();

      return rows.map((descricao) => ({
        descricao,
        data: new Date(),
        origem: 'Playwright',
      }));
    } catch (err: any) {
      this.logger.warn(`Playwright scrape falhou: ${err.message}`);
      return [];
    }
  }

  async buscarPrazos(numeroProcesso: string, tribunal?: string): Promise<PrazoExterno[]> {
    const movs = await this.buscarMovimentacoes(numeroProcesso, tribunal);
    return movs
      .filter((m) => /prazo|intima/i.test(m.descricao))
      .map((m) => {
        const dataLimite = new Date(m.data);
        dataLimite.setDate(dataLimite.getDate() + 15);
        return {
          descricao: m.descricao,
          dataLimite,
          origem: 'Playwright',
          urgencia: 'MEDIA' as const,
        };
      });
  }
}
