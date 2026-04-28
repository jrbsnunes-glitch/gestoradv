# Autenticação e multitenancy

## Autenticação de usuários do escritório

- **Endpoints:** [`AuthController`](../apps/api/src/auth/auth.controller.ts) — `POST /api/auth/login` (Passport local), `POST /api/auth/register`
- **JWT:** o login devolve `access_token`; o front ([`login/page.tsx`](../apps/web/src/app/login/page.tsx)) armazena o token (ex.: Zustand) e envia **Bearer** nas requisições à API
- **Sessões:** modelo `Session` existe no Prisma tenant para extensões futuras ou fluxos híbridos; o fluxo principal da web atual é JWT em memória/localStorage conforme `auth` store

**`NEXTAUTH_URL`:** usado pela API em **CORS** (`origin`) e convém coincidir com a URL base do front. **`NEXTAUTH_SECRET`** está no `.env.example` para alinhar com stacks Auth.js/NextAuth se forem adotados no futuro; o login atual não depende do pacote `next-auth` no `apps/web`.

## Autenticação admin (fornecedor)

- **Endpoint:** `POST /api/admin/auth/login`
- Rotas subsequentes em `/api/admin/*` usam **`AdminAuthGuard`** e Bearer token de admin.

## Licenciamento — modo standalone

- Dados no modelo **`Escritorio`**: `licencaChave`, `licencaValidade`, `licencaPlano`, `licencaAtiva`, histórico.
- **`LicenseGuard`**: chama `EscritorioService.checkAndRevalidate()` com cache de alguns minutos; bloqueia rotas protegidas se inválido.
- Ferramenta CLI: [`tools/license-manager`](../tools/license-manager/README.md) — geração/validação/renovação por CNPJ.

## Licenciamento — modo SaaS

- Com **`DEPLOYMENT_MODE=saas`**, o guard consulta **`TenantLicense`** no banco **master** pelo `tenantId` injetado no request.
- Requisitos: licença existente, `ativa=true`, `validade` futura.
- Gestão via API admin: gerar, revogar, renovar licença por tenant.

## Resolução de tenant (SaaS)

[`TenantMiddleware`](../apps/api/src/tenant/tenant.middleware.ts):

1. Ignora certos prefixos (ex.: `/api/admin`, `/api/health`).
2. Obtém **slug** via `X-Tenant-ID` ou subdomínio.
3. Carrega `Tenant` no master; valida ativo/não excluído.
4. Preenche `TenantContext` e anexa `tenantId` ao request.

[`TenantPrismaService`](../apps/api/src/tenant/tenant-prisma.service.ts) fornece instâncias `PrismaClient` por `databaseUrl` para isolamento por banco.

## Rotas sem checagem de licença de escritório

Lista atual (trecho lógico) em `LicenseGuard`: health, auth, escritório (configuração), webhooks, formulário público de atendimento, admin. Ajustar com cuidado para não expor operações sensíveis.
