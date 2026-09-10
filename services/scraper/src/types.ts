export type Tribunal = 'projudi' | 'pje' | 'esaj';

export interface Movimentacao {
  data: Date;
  descricao: string;
  tipo?: string;
}

export interface ScraperResult {
  tribunal: Tribunal;
  numeroProcesso: string;
  movimentacoes: Movimentacao[];
  success: boolean;
  error?: string;
}

export interface ScraperConfig {
  proxyUrl?: string;
  twoCaptchaKey?: string;
  headless?: boolean;
  timeout?: number;
}
