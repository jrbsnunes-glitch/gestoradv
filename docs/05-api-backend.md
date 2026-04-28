# API (backend)

## Entrada

- Arquivo principal: [`apps/api/src/main.ts`](../apps/api/src/main.ts)
- Prefixo global: **`api`** → rotas como `/api/auth/login`
- Porta padrão: **`PORT`** ou `3001`
- CORS: origem `NEXTAUTH_URL` ou `http://localhost:3000`
- Swagger: **`GET /api/docs`**

## Módulos NestJS

Importados em [`app.module.ts`](../apps/api/src/app.module.ts):

| Módulo | Responsabilidade |
|--------|-------------------|
| `ConfigModule` | Variáveis de ambiente globais |
| `MasterPrismaModule` | Cliente Prisma ao banco master |
| `PrismaModule` | Cliente Prisma tenant (singleton) |
| `TenantModule` | Middleware SaaS + contexto + pool multi-DB |
| `AuthModule` | Login/registro |
| `UsersModule` | Usuários |
| `ProcessosModule` | Processos |
| `ClientsModule` | Clientes |
| `PrazosModule` | Prazos |
| `TarefasModule` | Tarefas |
| `NotificationsModule` | Notificações |
| `QueuesModule` | BullMQ / Redis |
| `EmailModule` | Envio de e-mail |
| `UploadModule` | Upload de documentos |
| `ChatbotModule` | Chatbot |
| `AtendimentoModule` | Atendimentos + rotas públicas de formulário |
| `EscritorioModule` | Dados do escritório e licença (standalone) |
| `FinanceiroModule` | Financeiro e contas a pagar |
| `RelatoriosModule` | Relatórios |
| `WhatsappModule` | Webhooks WhatsApp |
| `CalendarModule` | Calendário |
| `TribunaisModule` | Integração tribunais/DATAJUD |
| `AdminModule` | Painel fornecedor (tenants, planos, licenças) |

## Controllers e prefixos REST

Prefixo base da API: `/api`. Caminhos relativos ao prefixo Nest `api`:

| Prefixo controller | Exemplo |
|--------------------|---------|
| `health` | Saúde da API |
| `auth` | `POST /auth/login`, `POST /auth/register` |
| `users` | CRUD usuários |
| `processos` | Processos |
| `clients` | Clientes |
| `prazos` | Prazos |
| `tarefas` | Tarefas |
| `notifications` | Notificações |
| `documents` | Upload/documentos |
| `chatbot` | Chatbot |
| `atendimentos` | Atendimentos autenticados |
| `atendimento` | Rotas públicas (formulário) |
| `escritorio` | Configuração do escritório |
| `financeiro`, `contas-pagar` | Financeiro |
| `relatorios` | Relatórios |
| `webhooks/whatsapp` | Webhook Meta |
| `tribunais` | Tribunais |
| `admin` | Autenticação admin, tenants, planos, licenças, dashboard |

## Guard de licença

`LicenseGuard` está registrado como **`APP_GUARD`** global. Rotas abertas (sem validação de licença de escritório) incluem, entre outras, prefixos como `/api/health`, `/api/auth`, `/api/escritorio`, `/api/webhooks`, `/api/atendimento/formulario`, `/api/admin` — ver implementação em [`license.guard.ts`](../apps/api/src/escritorio/license.guard.ts).

## SaaS: identificação de tenant

Com `DEPLOYMENT_MODE=saas`, o [`TenantMiddleware`](../apps/api/src/tenant/tenant.middleware.ts) exige:

- header **`X-Tenant-ID`** com valor igual ao **slug** do tenant, ou  
- hostname com **subdomínio** (3+ partes; primeiro segmento = slug).

Rotas `/api/admin` e `/api/health` não passam pela resolução obrigatória de tenant da mesma forma (ver código).

## Documentação OpenAPI

Gerada a partir dos decorators `@ApiTags`, `@ApiOperation`, etc. Acesse **`/api/docs`** em ambiente de desenvolvimento para lista completa e testes.
