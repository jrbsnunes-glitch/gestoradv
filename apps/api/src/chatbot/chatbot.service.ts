import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscritorioService } from '../escritorio/escritorio.service';

const TRIAGEM_PROMPT = `Você é um assistente jurídico especializado em triagem de casos para um escritório de advocacia brasileiro.

Sua função é:
1. Identificar a área do direito (trabalhista, civil, penal, família, tributário, previdenciário, consumidor, etc.)
2. Avaliar urgência (0-10)
3. Estimar complexidade (baixa, média, alta)
4. Determinar viabilidade inicial (0-100)

Faça perguntas objetivas e empáticas. Ao ter informações suficientes, forneça sua avaliação em formato JSON.`;

const PECA_TIPO_LABELS: Record<string, string> = {
  PETICAO_INICIAL: 'Petição Inicial',
  CONTESTACAO: 'Contestação',
  RECURSO: 'Recurso de Apelação',
  MEMORIAIS: 'Memoriais',
  HABEAS_CORPUS: 'Habeas Corpus',
};

@Injectable()
export class ChatbotService {
  private apiKey: string;

  constructor(
    private config: ConfigService,
    private escritorioService: EscritorioService,
  ) {
    this.apiKey = this.config.get('ANTHROPIC_API_KEY') || '';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async triagem(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.isConfigured) {
      return 'O serviço de IA não está configurado. Configure ANTHROPIC_API_KEY no arquivo .env para utilizar o chatbot.';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: TRIAGEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await response.json();
    const textBlock = data?.content?.find((b: any) => b.type === 'text');
    return textBlock?.text || 'Erro ao processar resposta.';
  }

  async gerarPeca(input: {
    tipo: string;
    parteAutora: string;
    parteRe: string;
    fatos: string;
    pedidos: string;
    advogadoNome?: string;
    advogadoOab?: string;
    advogadoOabEstado?: string;
  }): Promise<string> {
    if (!this.isConfigured) {
      return 'O serviço de IA não está configurado. Configure ANTHROPIC_API_KEY no arquivo .env.';
    }

    const escritorio = await this.escritorioService.getForDocument();
    const tipoLabel = PECA_TIPO_LABELS[input.tipo] || input.tipo;

    let escritorioBlock = '';
    if (escritorio) {
      const endereco = [escritorio.endereco, escritorio.numero, escritorio.complemento, escritorio.bairro]
        .filter(Boolean).join(', ');
      const cidadeUf = [escritorio.cidade, escritorio.estado].filter(Boolean).join('/');

      escritorioBlock = `
DADOS DO ESCRITÓRIO (usar no cabeçalho e rodapé da peça):
- Razão Social: ${escritorio.razaoSocial || escritorio.nomeFantasia || ''}
- CNPJ: ${escritorio.cnpj || ''}
- OAB Societária: ${escritorio.oabSocietaria || ''} / ${escritorio.oabEstado || ''}
- Endereço: ${endereco}${cidadeUf ? ` - ${cidadeUf}` : ''}${escritorio.cep ? ` - CEP ${escritorio.cep}` : ''}
- Telefone: ${escritorio.telefone || escritorio.celular || ''}
- Email: ${escritorio.email || ''}
${escritorio.website ? `- Website: ${escritorio.website}` : ''}`;
    }

    let advogadoBlock = '';
    if (input.advogadoNome) {
      advogadoBlock = `
ADVOGADO RESPONSÁVEL:
- ${input.advogadoNome}, OAB/${input.advogadoOabEstado || '??'} ${input.advogadoOab || ''}`;
    }

    const prompt = `Gere uma ${tipoLabel} completa e profissional.
${escritorioBlock}
${advogadoBlock}

DADOS DO CASO:
- Parte Autora: ${input.parteAutora}
- Parte Ré: ${input.parteRe}
- Fatos: ${input.fatos}
- Pedidos: ${input.pedidos}

REQUISITOS:
- Linguagem jurídica formal brasileira
- Use os dados do escritório no cabeçalho/timbre da peça
- Cite artigos de lei aplicáveis (CPC, CC, CLT, CP, CDC etc.)
- Fundamentação jurídica robusta
- Estrutura completa e correta para o tipo de peça
- Formato Markdown
- Inclua: local (${escritorio?.cidade || 'cidade'}), data atual, e espaço para assinatura do advogado`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const textBlock = data?.content?.find((b: any) => b.type === 'text');
    return textBlock?.text || 'Erro ao gerar peça.';
  }
}
