/**
 * Consolida docs/*.md e gera PDF via Chrome headless (HTML intermediário).
 * Requer Google Chrome instalado no caminho padrão do Windows.
 * Uso: node tools/build-docs-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SECTIONS = [
  'docs/README.md',
  'docs/01-visao-geral.md',
  'docs/02-arquitetura.md',
  'docs/03-stack-tecnologica.md',
  'docs/04-banco-de-dados.md',
  'docs/05-api-backend.md',
  'docs/06-frontend-web.md',
  'docs/07-autenticacao-e-multitenancy.md',
  'docs/08-variaveis-de-ambiente.md',
  'docs/09-instalacao-e-execucao.md',
  'docs/10-integracoes.md',
  'docs/11-ferramentas-e-servicos-auxiliares.md',
];

const MERMAID_REPLACEMENT = `
\`\`\`text
Fluxo de componentes (resumo para impressão):

  [Navegador] → [Next.js web] → [NestJS API]
                    |                |
              PostgreSQL (tenant)    Redis
                    |                |
              PostgreSQL (master, SaaS)  MongoDB

Standalone: um banco tenant com licença no modelo Escritorio.
SaaS: banco master (Tenant, TenantLicense) + banco(s) por tenant.
\`\`\`

*(Diagrama Mermaid interativo: docs/02-arquitetura.md no repositório.)*
`.trim();

function stripLeadingH1(md) {
  return md.replace(/^#\s+[^\n]+\n+/, '');
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    path.join(process.env['ProgramFiles'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  const edge = path.join(
    process.env['ProgramFiles(x86)'] || '',
    'Microsoft/Edge/Application/msedge.exe',
  );
  if (fs.existsSync(edge)) return edge;
  return null;
}

let body = '';
for (const rel of SECTIONS) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.error('Arquivo ausente:', fp);
    process.exit(1);
  }
  let text = fs.readFileSync(fp, 'utf8');
  if (rel.endsWith('README.md')) {
    text = stripLeadingH1(text);
    body += '# Índice e referência rápida\n\n' + text.trim() + '\n\n';
  } else {
    body += text.trim() + '\n\n';
  }
  body += '<div class="page-break"></div>\n\n';
}

body = body.replace(/```mermaid[\s\S]*?```/m, MERMAID_REPLACEMENT);

const header = `# GestorAdv — Documentação técnica completa

**Versão consolidada** (monorepo: API NestJS, web Next.js, Prisma, modos standalone e SaaS).

*Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}.*

---

`;

const fullMd = header + body;
const outMd = path.join(root, 'docs', 'gestoradv-documentacao-completa.md');
fs.writeFileSync(outMd, fullMd, 'utf8');
console.log('Markdown consolidado:', outMd);

const htmlContent = marked.parse(fullMd, { gfm: true, async: false });
const htmlDoc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GestorAdv — Documentação técnica</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      font-size: 11pt;
    }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #2563eb; padding-bottom: 0.35rem; margin-top: 0; }
    h2 { font-size: 1.2rem; margin-top: 1.75rem; page-break-after: avoid; }
    h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    code {
      background: #f1f5f9;
      padding: 0.12em 0.35em;
      border-radius: 4px;
      font-size: 0.88em;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.82rem;
    }
    pre code { background: none; padding: 0; border: 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.92rem; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; }
    a { color: #1d4ed8; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
    .page-break { page-break-after: always; height: 0; margin: 0; padding: 0; border: 0; }
    blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 4px solid #94a3b8; color: #475569; }
    @media print {
      body { padding: 12px; }
      a { text-decoration: none; color: #000; }
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

const outHtml = path.join(root, 'docs', 'gestoradv-documentacao-completa.html');
fs.writeFileSync(outHtml, htmlDoc, 'utf8');
console.log('HTML intermediário:', outHtml);

const chrome = findChrome();
if (!chrome) {
  console.error('Chrome ou Edge não encontrado. Instale o Google Chrome ou ajuste tools/build-docs-pdf.mjs.');
  process.exit(1);
}

const pdfFinal = path.join(root, 'docs', 'GestorAdv-Documentacao-Tecnica.pdf');
const fileUrl = pathToFileURL(outHtml).href;

const args = [
  `"${chrome}"`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-pdf-header-footer',
  `--print-to-pdf="${pdfFinal}"`,
  `"${fileUrl}"`,
];

try {
  execSync(args.join(' '), { stdio: 'inherit', shell: true, cwd: root });
  if (fs.existsSync(pdfFinal)) {
    const stat = fs.statSync(pdfFinal);
    console.log('PDF gerado:', pdfFinal, `(${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('PDF não foi criado em:', pdfFinal);
    process.exit(1);
  }
} catch (e) {
  console.error('Falha ao gerar PDF com o navegador headless:', e?.message || e);
  process.exit(1);
}
