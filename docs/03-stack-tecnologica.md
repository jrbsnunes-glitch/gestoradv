# Stack tecnológica

Valores abaixo referem-se ao estado atual do repositório (consulte `package.json` nos pacotes para versões exatas).

## Runtime e tooling

| Tecnologia | Uso |
|------------|-----|
| **Node.js** | `>= 20` (raiz [`package.json`](../package.json) `engines`) |
| **pnpm** | `10.33.0` (`packageManager`) |
| **TypeScript** | Tipagem estrita nos apps e packages |
| **Turborepo** | Build e `turbo dev` na raiz |
| **Prettier** | Formatação |

## Backend (`apps/api`)

| Pacote | Função |
|--------|--------|
| **NestJS** | Framework HTTP, módulos, injeção de dependências |
| **@nestjs/swagger** | OpenAPI / Swagger |
| **Passport** (JWT, local) | Autenticação |
| **class-validator / class-transformer** | DTOs e validação |
| **Helmet** | Cabeçalhos de segurança HTTP |
| **BullMQ** | Filas assíncronas (Redis) |
| **Nodemailer** | E-mail |

## Frontend (`apps/web`)

| Pacote | Função |
|--------|--------|
| **Next.js** (~15) | App Router, SSR/SSG |
| **React** (~19) | UI |
| **TanStack Query** | Cache e requisições |
| **React Hook Form + Zod** | Formulários |
| **Tailwind CSS** (~4) | Estilos |

## Dados (`packages/database`)

| Pacote | Função |
|--------|--------|
| **Prisma** | ORM, dois schemas: tenant e master |

## Infraestrutura local

| Serviço | Imagem / uso |
|---------|----------------|
| **PostgreSQL** | 16-alpine (`docker-compose.yml`) |
| **Redis** | 7-alpine |
| **MongoDB** | 7 |

## Serviços auxiliares (`services/`)

Pacotes Node separados (ex.: chatbot com triagem, scraper Playwright, gerador de peças). Dependências próprias em cada `package.json`; não são necessariamente iniciados pelo `turbo dev` da raiz — ver [Ferramentas e serviços auxiliares](11-ferramentas-e-servicos-auxiliares.md).
