# Documentação técnica — GestorAdv

Índice da documentação do monorepo **GestorAdv** (gestão para escritórios de advocacia).

## PDF consolidado

O arquivo **[`GestorAdv-Documentacao-Tecnica.pdf`](GestorAdv-Documentacao-Tecnica.pdf)** reúne todos os capítulos abaixo num único PDF. Para regenerá-lo após editar os `.md`:

```bash
pnpm docs:pdf
```

Requisitos: **Node.js**, dependência `marked` na raiz do monorepo, e **Google Chrome** (ou **Edge**) instalado no caminho padrão do Windows — o script usa o navegador em modo headless para imprimir o HTML.

| Documento | Conteúdo |
|-----------|----------|
| [Visão geral](01-visao-geral.md) | Objetivo do produto, escopo e princípios |
| [Arquitetura](02-arquitetura.md) | Monorepo, modos de deploy, fluxos |
| [Stack tecnológica](03-stack-tecnologica.md) | Versões e dependências principais |
| [Banco de dados](04-banco-de-dados.md) | Prisma, schema tenant vs master, comandos |
| [API (backend)](05-api-backend.md) | NestJS, módulos, Swagger, saúde |
| [Frontend web](06-frontend-web.md) | Next.js App Router, rotas, variáveis |
| [Autenticação e multitenancy](07-autenticacao-e-multitenancy.md) | Auth, licenças, SaaS vs standalone |
| [Variáveis de ambiente](08-variaveis-de-ambiente.md) | Referência de `.env` |
| [Instalação e execução](09-instalacao-e-execucao.md) | Dev, Docker, build |
| [Integrações](10-integracoes.md) | Filas, WhatsApp, tribunais, e-mail |
| [Ferramentas e serviços auxiliares](11-ferramentas-e-servicos-auxiliares.md) | License manager, provisioner, `services/` |
| [Testes e homologação](12-testes-e-homologacao.md) | Comandos `test` / `test:e2e`, `.env.test`, CI |
| [Checklist UAT](checklist-uat.md) | Roteiro manual standalone/SaaS e integrações |

**Referência rápida**

- API REST (prefixo global): `/api`
- Documentação interativa: `http://<host>:<PORT>/api/docs` (Swagger)
- Front padrão dev: porta **3000**; API padrão dev: porta **3001**

Documentos de apresentação comercial existentes em `portfolio-gestoradv-*` permanecem separados desta documentação técnica.
