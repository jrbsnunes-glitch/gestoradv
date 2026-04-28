export interface PrazoExterno {
  descricao: string;
  dataLimite: Date;
  origem: string;
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

export interface MovimentacaoExterna {
  descricao: string;
  data: Date;
  tipo?: string;
  origem: string;
}

export interface TribunalConnector {
  nome: string;
  suportaTribunal(tribunal: string): boolean;
  buscarPrazos(numeroProcesso: string): Promise<PrazoExterno[]>;
  buscarMovimentacoes(numeroProcesso: string): Promise<MovimentacaoExterna[]>;
}
