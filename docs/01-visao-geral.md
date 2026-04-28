# Visão geral

## Objetivo

O **GestorAdv** é um sistema para **gestão de escritórios de advocacia**, com foco em processos, clientes, prazos, financeiro, atendimento, relatórios e integrações (comunicação e tribunais). O código está organizado como **monorepo** TypeScript, com API em NestJS e interface web em Next.js.

## Escopo técnico atual

- **Backend**: API REST (`apps/api`), validação com `class-validator`, documentação OpenAPI (Swagger).
- **Frontend**: SPA/SSR com Next.js App Router (`apps/web`).
- **Dados**: PostgreSQL (Prisma), Redis (filas BullMQ), MongoDB (variáveis de ambiente previstas; uso conforme módulos).
- **Modos de operação**: instalação **standalone** (um escritório por base) ou **SaaS multi-tenant** (banco master + tenants com bancos dedicados), configurável por ambiente.

## Conformidade e segurança

O modelo de dados inclui campos de LGPD (consentimento, rastreabilidade em auditoria onde aplicável). A API usa **Helmet**, **CORS** restrito à origem configurada em **`NEXTAUTH_URL`** (nome herdado do ecossistema; o login web atual usa **JWT** retornado por `POST /api/auth/login` e estado no cliente). **ValidationPipe** global e guards JWT nas rotas protegidas. Detalhes em [Autenticação e multitenancy](07-autenticacao-e-multitenancy.md).

## Documentação de produto vs técnica

- Esta pasta (`docs/*.md`) descreve **implementação e operação**.
- Arquivos `portfolio-gestoradv-*` e `contexto.txt` são materiais de contexto/apresentação e podem antecipar funcionalidades ainda não refletidas integralmente no código.
