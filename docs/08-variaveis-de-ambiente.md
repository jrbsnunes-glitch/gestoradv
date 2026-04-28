# Variáveis de ambiente

Referência baseada em [`.env.example`](../.env.example). Copie para `.env` na raiz e/ou em `apps/api` conforme o fluxo de carregamento do projeto.

## Banco e multitenancy

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL schema **tenant** |
| `MASTER_DATABASE_URL` | PostgreSQL schema **master** (SaaS) |
| `MONGODB_URI` | MongoDB |
| `REDIS_URL` | Redis (filas BullMQ) |
| `DEPLOYMENT_MODE` | `standalone` (padrão) ou `saas` |
| `TENANT_DB_HOST` / `TENANT_DB_PORT` / `TENANT_DB_USER` / `TENANT_DB_PASSWORD` | Usados em provisionamento/admin ao criar bancos de tenant |

## IA

| Variável | Descrição |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Claude |
| `OPENAI_API_KEY` | OpenAI |
| `PINECONE_API_KEY` | Vetores (se RAG) |

## WhatsApp (fallback global)

Credenciais também podem ser armazenadas por escritório no banco (`Escritorio`).

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_BUSINESS_ID` | ID do negócio |
| `WHATSAPP_ACCESS_TOKEN` | Token de acesso |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número |
| `WHATSAPP_VERIFY_TOKEN` | Verificação do webhook |

## E-mail

| Variável | Descrição |
|----------|-----------|
| `SENDGRID_API_KEY` | SendGrid |
| `SMTP_HOST` / `SMTP_PORT` | SMTP genérico |

## Google / Meta

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads |
| `GOOGLE_CALENDAR_API_KEY` | Calendário |
| `META_APP_ID` / `META_APP_SECRET` / `META_ACCESS_TOKEN` | Meta |

## Autenticação web/API

| Variável | Descrição |
|----------|-----------|
| `NEXTAUTH_SECRET` | Reservado / futuro Auth.js; gerar valor forte |
| `NEXTAUTH_URL` | URL pública do front — **origem CORS** da API (`main.ts`) |
| `JWT_SECRET` | Assinatura JWT dos usuários da API |
| `ADMIN_JWT_SECRET` | Assinatura JWT do painel admin |

## Monitoramento e scraping

| Variável | Descrição |
|----------|-----------|
| `SENTRY_DSN` | Sentry |
| `LOGTAIL_TOKEN` | Logs |
| `PROXY_URL` | Proxy scraping |
| `TWOCAPTCHA_API_KEY` | Captcha |

## API (porta)

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta da API Nest (padrão 3001) |

## Front (build)

Prefixo `NEXT_PUBLIC_*` é embutido no bundle do Next.js em build time.

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | Base da API vista pelo browser (ex.: `https://api.exemplo.com/api`) |
