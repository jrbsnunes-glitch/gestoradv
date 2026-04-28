# Testes e homologação

## Tipos de teste no repositório

| Tipo | Comando | Descrição |
|------|---------|-----------|
| Unitários (API) | `pnpm test` | Jest nos serviços com mocks (`*.spec.ts` em `apps/api/src`). |
| Integração HTTP (API) | `pnpm test:e2e` | Jest + Supertest sobe `AppModule`, banco dedicado — ver abaixo. |
| Smoke UI (web) | `pnpm test:e2e:web` | Playwright — requer API + web rodando (ou configurar `webServer`). |

## Ambiente para `test:e2e` (API)

1. `pnpm docker:up` (Postgres, Redis, Mongo).
2. Na **primeira** subida com volume novo, o script [`docker/init/01-databases.sql`](../docker/init/01-databases.sql) cria `gestoradv_master`, `gestoradv_e2e` e `gestoradv_e2e_master`. Em instalações antigas, crie esses bancos manualmente ou recrie o volume Postgres.
3. Copie [`.env.test.example`](../.env.test.example) para **`.env.test`** na raiz e ajuste se necessário.
4. Gere clientes Prisma: `pnpm db:generate:all`.
5. Execute: `pnpm test:e2e` (aplica `prisma db push` nos dois bancos e2e automaticamente, salvo `SKIP_E2E_DB_PUSH=1`).

## Checklist UAT manual

Ver **[checklist-uat.md](./checklist-uat.md)** para validação funcional (standalone/SaaS, módulos, integrações com sandbox).

## CI

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): testes unitários da API e `test:e2e` com Postgres e Redis de serviço.

## Migração: volumes Docker antigos

Se você usava caminhos absolutos no `docker-compose` (ex.: `d:/.../.docker-data`), os dados antigos ficam nessa pasta. O compose atual usa **volumes nomeados** Docker. Para manter dados: migre com `pg_dump`/`pg_restore` ou mantenha um override local; para ambiente de testes, volumes novos são aceitáveis.
