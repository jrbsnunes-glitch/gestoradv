export type PecaTipo =
  | 'PETICAO_INICIAL'
  | 'CONTESTACAO'
  | 'RECURSO'
  | 'MEMORIAIS'
  | 'HABEAS_CORPUS';

export interface PecaInput {
  tipo: PecaTipo;
  dadosCaso: {
    parteAutora: string;
    parteRe: string;
    fatos: string;
    pedidos: string[];
    vara?: string;
    comarca?: string;
    valorCausa?: number;
  };
  jurisprudencia?: string;
  advogado: {
    nome: string;
    oab: string;
    oabEstado: string;
  };
}

export interface PecaOutput {
  markdown: string;
  tipo: PecaTipo;
  titulo: string;
}
