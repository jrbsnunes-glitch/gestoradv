import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscritorioService } from '../escritorio/escritorio.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../knowledge/rag.service';

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
  constructor(
    private config: ConfigService,
    private llm: LlmService,
    private escritorioService: EscritorioService,
    private rag: RagService,
  ) {}

  get isConfigured(): boolean {
    return !!(this.config.get('ANTHROPIC_API_KEY') || this.config.get('OPENAI_API_KEY'));
  }

  async triagem(messages: Array<{ role: string; content: string }>, systemPrompt?: string): Promise<string> {
    if (!this.isConfigured) {
      return 'O serviço de IA não está configurado. Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY no arquivo .env.';
    }

    const result = await this.llm.complete({
      system: systemPrompt || TRIAGEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      maxTokens: 2048,
    });

    return result.text || 'Erro ao processar resposta.';
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
      return 'O serviço de IA não está configurado. Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY no .env.';
    }

    const escritorio = await this.escritorioService.getForDocument();
    const tipoLabel = PECA_TIPO_LABELS[input.tipo] || input.tipo;

    let escritorioBlock = '';
    if (escritorio) {
      const endereco = [escritorio.endereco, escritorio.numero, escritorio.complemento, escritorio.bairro]
        .filter(Boolean)
        .join(', ');
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

    const ragContext = await this.rag.retrieveDocuments(
      `${input.tipo} ${input.fatos} ${input.pedidos}`,
      5,
    );
    const jurisprudenciaBlock =
      ragContext.length > 0
        ? `\nCONTEXTO JURÍDICO (use como referência, cite se aplicável):\n${ragContext.map((d) => `- ${d.titulo}: ${d.conteudo.slice(0, 600)}`).join('\n')}`
        : '';

    const prompt = `Gere uma ${tipoLabel} completa e profissional.
${escritorioBlock}
${advogadoBlock}
${jurisprudenciaBlock}

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

    const result = await this.llm.complete({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8192,
    });

    return result.text || 'Erro ao gerar peça.';
  }
}
