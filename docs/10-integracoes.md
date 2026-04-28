# Integrações

## Filas (Redis / BullMQ)

Módulo [`QueuesModule`](../apps/api/src/queues/queues.module.ts):

- Conexão Redis derivada de **`REDIS_URL`** (host/porta).
- Fila registrada: **`prazos-alerts`** — processador `PrazosAlertProcessor` para alertas de prazos (`PrazosAlertService`).

## WhatsApp

- **Webhook:** controller em `webhooks/whatsapp` ([`WhatsappController`](../apps/api/src/integrations/whatsapp/whatsapp.controller.ts)).
- Credenciais podem vir do **`.env`** global ou dos campos do modelo **`Escritorio`** no banco (integrações por escritório), conforme implementação do `WhatsappService`.

## Tribunais / DATAJUD

- Módulo **`TribunaisModule`** — API para consultas; chave pode ser configurada no escritório (`datajudApiKey` em `Escritorio`).

## E-mail

- **`EmailModule`** — envio via Nodemailer com configuração SMTP/SendGrid a partir do ambiente.

## Calendário

- **`CalendarModule`** — integração Google Calendar (depende de chaves no `.env`).

## Upload de documentos

- **`UploadModule`** — rotas sob prefixo `documents` para upload/armazenamento de arquivos do escritório.

## Chatbot

- **`ChatbotModule`** — endpoints REST do assistente; pode depender de serviços de IA configurados no ambiente.

## Serviços separados (`services/`)

Pacotes opcionais com responsabilidades específicas (triagem, scraping com Playwright, geração de peças). Não fazem parte do processo único `pnpm dev` da raiz salvo configuração adicional — ver [Ferramentas e serviços auxiliares](11-ferramentas-e-servicos-auxiliares.md).

## Webhooks e segurança

Exponha webhooks apenas com HTTPS em produção e valide tokens (ex.: `WHATSAPP_VERIFY_TOKEN`). Mantenha segredos fora do repositório.
