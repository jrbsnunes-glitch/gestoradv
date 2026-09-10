import { Injectable, Logger } from '@nestjs/common';
import { TribunalConnector, PrazoExterno, MovimentacaoExterna } from '../interfaces/tribunal-connector.interface';

@Injectable()
export class StubConnector implements TribunalConnector {
  readonly nome = 'Stub';
  private readonly logger = new Logger(StubConnector.name);

  suportaTribunal(_tribunal: string): boolean {
    return false;
  }

  async buscarPrazos(numeroProcesso: string, _tribunal?: string): Promise<PrazoExterno[]> {
    this.logger.log(`[Stub] buscarPrazos chamado para processo ${numeroProcesso} — nenhum connector real configurado`);
    return [];
  }

  async buscarMovimentacoes(numeroProcesso: string, _tribunal?: string): Promise<MovimentacaoExterna[]> {
    this.logger.log(`[Stub] buscarMovimentacoes chamado para processo ${numeroProcesso} — nenhum connector real configurado`);
    return [];
  }
}
