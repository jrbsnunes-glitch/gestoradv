import Anthropic from '@anthropic-ai/sdk';
import type { PecaInput, PecaOutput, PecaTipo } from './types';

const TIPO_LABELS: Record<PecaTipo, string> = {
  PETICAO_INICIAL: 'Petição Inicial',
  CONTESTACAO: 'Contestação',
  RECURSO: 'Recurso de Apelação',
  MEMORIAIS: 'Memoriais',
  HABEAS_CORPUS: 'Habeas Corpus',
};

export class PecaGeneratorService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(input: PecaInput): Promise<PecaOutput> {
    const prompt = this.buildPrompt(input);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const markdown = textBlock?.text || '';

    return {
      markdown,
      tipo: input.tipo,
      titulo: `${TIPO_LABELS[input.tipo]} - ${input.dadosCaso.parteAutora} vs ${input.dadosCaso.parteRe}`,
    };
  }

  private buildPrompt(input: PecaInput): string {
    const { tipo, dadosCaso, jurisprudencia, advogado } = input;
    return `
Você é um advogado brasileiro experiente. Gere uma ${TIPO_LABELS[tipo]} completa.

DADOS DO CASO:
- Parte Autora: ${dadosCaso.parteAutora}
- Parte Ré: ${dadosCaso.parteRe}
- Fatos: ${dadosCaso.fatos}
- Pedidos: ${dadosCaso.pedidos.join('; ')}
${dadosCaso.vara ? `- Vara: ${dadosCaso.vara}` : ''}
${dadosCaso.comarca ? `- Comarca: ${dadosCaso.comarca}` : ''}
${dadosCaso.valorCausa ? `- Valor da Causa: R$ ${dadosCaso.valorCausa.toLocaleString('pt-BR')}` : ''}

ADVOGADO:
- ${advogado.nome}, OAB/${advogado.oabEstado} ${advogado.oab}

${jurisprudencia ? `JURISPRUDÊNCIA RELEVANTE:\n${jurisprudencia}` : ''}

REQUISITOS:
- Linguagem jurídica formal brasileira
- Cite artigos de lei aplicáveis
- Fundamentação jurídica robusta
- Estrutura correta para o tipo de peça
- Formato Markdown
- Inclua local, data e espaço para assinatura

Gere a peça completa:
    `.trim();
  }
}
