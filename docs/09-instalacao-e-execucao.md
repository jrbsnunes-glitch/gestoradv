# Instalação e execução

## Pré-requisitos

- **Node.js** ≥ 20  
- **pnpm** (versão fixada no [`package.json`](../package.json) raiz)  
- **Docker** + Docker Compose (recomendado para Postgres, Redis e MongoDB locais)

## Clonar e instalar dependências

```bash
pnpm install
```

Na raiz do monorepo.

## Variáveis de ambiente

1. Copie [`.env.example`](../.env.example) para `.env` na raiz (e ajuste `apps/api` se o Nest carregar `.env` local).
2. Gere segredos fortes para `NEXTAUTH_SECRET`, `JWT_SECRET`, `ADMIN_JWT_SECRET`.
3. Ajuste `NEXTAUTH_URL` e `NEXT_PUBLIC_API_URL` para a URL real do front e da API.

## Banco de dados com Docker

```bash
pnpm docker:up
```

Equivale a `docker compose up -d` ([`package.json`](../package.json)).

Serviços definidos em [`docker-compose.yml`](../docker-compose.yml):

- **PostgreSQL** — porta `5432`, usuário/senha/db conforme compose  
- **Redis** — `6379`  
- **MongoDB** — `27017`

**Volumes:** o [`docker-compose.yml`](../docker-compose.yml) usa **volumes nomeados** Docker (`gestoradv_postgres_data`, etc.), portáveis entre máquinas. Na **primeira** inicialização do volume, os scripts em [`docker/init`](../docker/init) criam os bancos extras `gestoradv_master`, `gestoradv_e2e` e `gestoradv_e2e_master`. Se você já tinha dados em um caminho bind-mount antigo, migre com backup/restore ou recrie o ambiente — ver [Testes e homologação](12-testes-e-homologacao.md).

Se os bancos extras não existirem (volume antigo), crie manualmente: `CREATE DATABASE gestoradv_master;` (e os de e2e, se for rodar `pnpm test:e2e`).

## Prisma

Gerar clientes e aplicar schema (desenvolvimento):

```bash
pnpm db:generate
pnpm db:push
```

Para master também:

```bash
pnpm --filter @gestor-adv/database generate:master
pnpm --filter @gestor-adv/database push:master
```

(ou scripts `generate:all` / `push:all` dentro do pacote `database`).

## Desenvolvimento

Na raiz:

```bash
pnpm dev
```

Turborepo sobe os apps configurados (API + web). Portas típicas: **3000** (web), **3001** (API).

## Build de produção

```bash
pnpm build
```

Executar `turbo build` nos workspaces. Para servir: `next start` no web e `node dist/main` na API (após `nest build`), conforme scripts de cada app.

## Acesso

- Front: `http://localhost:3000` (ou URL configurada)  
- API: `http://localhost:3001/api`  
- Swagger: `http://localhost:3001/api/docs`

## Nome de host em vez de localhost

Para usar um hostname (ex.: `gestoradv.local`), configure DNS interno ou o arquivo `hosts` e alinhe `NEXTAUTH_URL` e `NEXT_PUBLIC_API_URL` — ver [Frontend web](06-frontend-web.md).
