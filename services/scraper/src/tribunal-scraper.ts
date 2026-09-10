import type { Tribunal, ScraperResult, ScraperConfig } from './types';

export class TribunalScraper {
  private config: ScraperConfig;

  constructor(config: ScraperConfig = {}) {
    this.config = { headless: true, timeout: 30000, ...config };
  }

  async scrape(tribunal: Tribunal, numeroProcesso: string): Promise<ScraperResult> {
    switch (tribunal) {
      case 'projudi':
        return this.scrapeWithPlaywright('projudi', numeroProcesso);
      case 'pje':
        return this.scrapeWithPlaywright('pje', numeroProcesso);
      case 'esaj':
        return this.scrapeWithPlaywright('esaj', numeroProcesso);
      default:
        return { tribunal, numeroProcesso, movimentacoes: [], success: false, error: 'Tribunal não suportado' };
    }
  }

  private async scrapeWithPlaywright(tribunal: Tribunal, numeroProcesso: string): Promise<ScraperResult> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: this.config.headless,
        proxy: this.config.proxyUrl ? { server: this.config.proxyUrl } : undefined,
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(this.config.timeout || 30000);

      const url = this.resolveSearchUrl(tribunal, numeroProcesso);
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const movimentacoes = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tr, .movimentacao, .evento'));
        return rows.slice(0, 15).map((row) => ({
          descricao: (row.textContent || '').trim().slice(0, 500),
          data: new Date().toISOString(),
        }));
      });

      await browser.close();

      const filtered = movimentacoes.filter((m) => m.descricao.length > 10);

      return {
        tribunal,
        numeroProcesso,
        movimentacoes: filtered.map((m) => ({
          descricao: m.descricao,
          data: new Date(m.data),
        })),
        success: filtered.length > 0,
        error: filtered.length === 0 ? 'Nenhuma movimentação encontrada (seletores podem precisar ajuste por tribunal)' : undefined,
      };
    } catch (err: any) {
      return {
        tribunal,
        numeroProcesso,
        movimentacoes: [],
        success: false,
        error: err.message || 'Playwright indisponível ou portal inacessível',
      };
    }
  }

  private resolveSearchUrl(tribunal: Tribunal, numeroProcesso: string): string {
    const num = encodeURIComponent(numeroProcesso.replace(/\D/g, ''));
    switch (tribunal) {
      case 'pje':
        return `https://pje.trt3.jus.br/consultaprocessual/pages/consultas/ConsultaProcessual.seam?numero=${num}`;
      case 'esaj':
        return `https://esaj.tjsp.jus.br/cpopg/show.do?processo.numero=${num}`;
      case 'projudi':
      default:
        return `https://projudi.tjpr.jus.br/projudi_consulta/publico/processos/ConsultaProcesso?numero=${num}`;
    }
  }
}
