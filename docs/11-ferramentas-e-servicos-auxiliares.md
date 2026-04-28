# Ferramentas e serviços auxiliares

## `tools/license-manager`

Script Node para **gerar, validar, renovar e revogar licenças** no modo standalone, operando diretamente no PostgreSQL do tenant.

- Documentação: [`tools/license-manager/README.md`](../tools/license-manager/README.md)
- Requer `DATABASE_URL` apontando ao banco do escritório.
- Fluxo: trial automático na criação do escritório; após expiração, geração de chave por CNPJ e ativação na interface.

## `tools/tenant-provisioner`

Script [`migrate-existing.ts`](../tools/tenant-provisioner/migrate-existing.ts) para cenários de migração/provisionamento com **`MASTER_DATABASE_URL`** e instruções para `DEPLOYMENT_MODE=saas`.

Comando relacionado no pacote database: `pnpm migrate:tenant` (no pacote `@gestor-adv/database`).

## `services/chatbot`

Serviço de triagem/conversa (`src/triagem.service.ts`, `prompts.ts`). Execução via scripts do próprio pacote (`package.json` local).

## `services/scraper`

Scraping de tribunais (`tribunal-scraper.ts`), depende de Playwright. Uso operacional separado da API principal.

## `services/document-generator`

Geração de peças (`peca-generator.service.ts`); tipos em `types.ts`.

---

Estes pacotes evoluem de forma independente da API Nest; integração em produção pode exigir chamadas HTTP internas, filas ou empacotamento como biblioteca — avaliar caso a caso.
