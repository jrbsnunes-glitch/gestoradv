# Banco de dados

## Dois schemas Prisma

O pacote [`packages/database`](../packages/database) define:

1. **Schema tenant** — [`prisma/schema.prisma`](../packages/database/prisma/schema.prisma)  
   - Variável: `DATABASE_URL`  
   - Dados do escritório: usuários, clientes, processos, prazos, tarefas, documentos, notificações, financeiro (`Lancamento`, `ContaPagar`), atendimento, auditoria, **`Escritorio`** (incluindo campos de licença e integrações).

2. **Schema master** — [`prisma/master.prisma`](../packages/database/prisma/master.prisma)  
   - Variável: `MASTER_DATABASE_URL`  
   - Modelos: **`Tenant`**, **`TenantLicense`**, **`TenantPlan`**, **`AdminUser`** (painel fornecedor SaaS).

## Modelos principais (tenant)

| Área | Modelos |
|------|---------|
| Auth | `User`, `Session` |
| CRM | `Client` |
| Processual | `Processo`, `Movimentacao`, `Prazo`, `Documento`, `Tarefa` |
| Sistema | `Notification`, `Escritorio`, `AuditLog` |
| Financeiro | `Lancamento`, `ContaPagar` |
| Atendimento | `Atendimento`, `AtendimentoMensagem` |

Enums relevantes: `Role`, `ProcessoStatus`, `AreaDireito`, `PrazoStatus`, `LancamentoTipo`, etc.

## Modelos principais (master)

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Escritório no SaaS: `slug`, `cnpj`, `databaseUrl`, `databaseName`, flags de ativo/excluído |
| `TenantLicense` | Licença por `tenantId`: chave, plano, validade, ativa |
| `TenantPlan` | Planos com limites (usuários, processos, armazenamento, flags de WhatsApp/IA) |
| `AdminUser` | Usuários do painel administrativo do fornecedor |

## Comandos Prisma (pacote `database`)

Executar a partir de `packages/database` ou via scripts da raiz (`pnpm db:*`):

| Script | Descrição |
|--------|-----------|
| `generate` | Cliente Prisma schema tenant |
| `generate:master` | Cliente Prisma schema master |
| `generate:all` | Ambos |
| `push` / `push:master` / `push:all` | `db push` (dev; sincroniza schema sem migration formal) |
| `migrate` | `prisma migrate dev` (tenant) |
| `studio` / `studio:master` | Prisma Studio |
| `seed` / `seed:master` | Seeds (quando implementados) |
| `migrate:tenant` | Script [`tools/tenant-provisioner/migrate-existing.ts`](../tools/tenant-provisioner/migrate-existing.ts) |

A raiz expõe atalhos: `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:studio` (ver [`package.json`](../package.json)).

## Bancos lógicos no Docker

O [`docker-compose.yml`](../docker-compose.yml) cria um único cluster PostgreSQL com banco padrão `gestoradv`. Em desenvolvimento costuma-se criar também o banco **`gestoradv_master`** (conforme `MASTER_DATABASE_URL` no `.env.example`) manualmente ou via script, para o schema master.

**Nota:** o `docker-compose` atual pode usar volumes com caminho absoluto da máquina de desenvolvimento; em outro ambiente, ajuste os volumes ou use volumes nomeados (ver [Instalação e execução](09-instalacao-e-execucao.md)).
