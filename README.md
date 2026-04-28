# GestorAdv

Monorepo do **GestorAdv** — sistema de gestão para escritórios de advocacia (processos, clientes, prazos, financeiro, atendimento e integrações).

## Documentação técnica

O PDF completo está em **[`docs/GestorAdv-Documentacao-Tecnica.pdf`](docs/GestorAdv-Documentacao-Tecnica.pdf)**. Para gerar de novo: `pnpm docs:pdf`.

Toda a documentação em Markdown está em **[`docs/README.md`](docs/README.md)**:

- Arquitetura e modos standalone/SaaS  
- Stack, banco de dados (Prisma tenant + master)  
- API NestJS, frontend Next.js  
- Autenticação, licenças, variáveis de ambiente  
- Instalação, Docker, integrações  
- Ferramentas (`license-manager`, `tenant-provisioner`, `services/`)

## Início rápido

```bash
pnpm install
cp .env.example .env   # ajustar variáveis
pnpm docker:up         # Postgres, Redis, MongoDB
pnpm db:generate
pnpm db:push
pnpm dev
```

Portas padrão: web **3000**, API **3001**. Swagger: `http://localhost:3001/api/docs`.

## Testes

- **Unitários (API):** `pnpm test`
- **Integração HTTP (API):** copie [`.env.test.example`](.env.test.example) para `.env.test`, suba o Docker (`pnpm docker:up`), rode `pnpm db:generate:all` e `pnpm test:e2e`
- **Smoke UI (Playwright):** com API + web no ar, `pnpm exec playwright install chromium` (uma vez) e `pnpm test:e2e:web`

Detalhes: [`docs/12-testes-e-homologacao.md`](docs/12-testes-e-homologacao.md).

## Licença

Proprietário — uso conforme acordo do projeto.
