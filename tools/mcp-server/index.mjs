#!/usr/bin/env node
/**
 * Servidor MCP GestorAdv — expõe processos, prazos e FAQs para agentes externos.
 * Uso: node tools/mcp-server/index.mjs
 * Env: GESTORADV_API_URL, GESTORADV_TOKEN
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API = process.env.GESTORADV_API_URL || 'http://localhost:3001/api';
const TOKEN = process.env.GESTORADV_TOKEN || '';

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

const server = new Server(
  { name: 'GestorAdv', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_processo',
      description: 'Busca movimentações externas de um processo pelo número CNJ',
      inputSchema: {
        type: 'object',
        properties: {
          numero: { type: 'string' },
          tribunal: { type: 'string' },
        },
        required: ['numero'],
      },
    },
    {
      name: 'get_prazos_externos',
      description: 'Busca prazos sugeridos de tribunais para um processo',
      inputSchema: {
        type: 'object',
        properties: {
          numero: { type: 'string' },
          tribunal: { type: 'string' },
        },
        required: ['numero'],
      },
    },
    {
      name: 'list_faqs',
      description: 'Lista FAQs da base de conhecimento do escritório',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === 'search_processo') {
      const q = new URLSearchParams();
      if (args.tribunal) q.set('tribunal', String(args.tribunal));
      const data = await apiFetch(`/tribunais/${encodeURIComponent(args.numero)}/movimentacoes?${q}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    if (name === 'get_prazos_externos') {
      const q = new URLSearchParams();
      if (args.tribunal) q.set('tribunal', String(args.tribunal));
      const data = await apiFetch(`/tribunais/${encodeURIComponent(args.numero)}/prazos?${q}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    if (name === 'list_faqs') {
      const data = await apiFetch('/knowledge/faqs');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    return { content: [{ type: 'text', text: 'Ferramenta desconhecida' }], isError: true };
  } catch (err) {
    return { content: [{ type: 'text', text: String(err.message) }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
