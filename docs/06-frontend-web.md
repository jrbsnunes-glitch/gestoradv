# Frontend web

## Stack

- **Next.js** App Router — diretório [`apps/web/src/app`](../apps/web/src/app)
- Estilos: **Tailwind CSS**
- Estado: **Zustand** (ex.: sessão do usuário e token JWT após login)
- Dados: **TanStack Query** + fetch para a API
- Formulários: **React Hook Form** + **Zod** (validadores em `@gestor-adv/validators` quando aplicável)

## Porta e scripts

- Desenvolvimento: `next dev --port 3000` ([`apps/web/package.json`](../apps/web/package.json))
- Produção: `next build` / `next start` (porta configurável pelo host)

## URL da API

O front usa a variável **`NEXT_PUBLIC_API_URL`**, com fallback **`http://localhost:3001/api`** (ex.: [`apps/web/src/lib/api.ts`](../apps/web/src/lib/api.ts)).

**Importante:** em produção ou ao usar hostname customizado, defina `NEXTAUTH_URL` e `NEXT_PUBLIC_API_URL` de forma consistente com a URL que o usuário acessa no navegador.

## Mapa de rotas (App Router)

| Rota | Função típica |
|------|----------------|
| `/` | Home |
| `/login` | Login do escritório |
| `/register` | Cadastro |
| `/landing` | Landing |
| `/dashboard` | Painel principal |
| `/dashboard/processos` | Processos |
| `/dashboard/processos/[id]` | Detalhe do processo |
| `/dashboard/clientes` | Clientes |
| `/dashboard/prazos` | Prazos |
| `/dashboard/tarefas` | Tarefas |
| `/dashboard/documentos` | Documentos |
| `/dashboard/financeiro` | Financeiro |
| `/dashboard/escritorio` | Dados e integrações do escritório |
| `/dashboard/advogados` | Advogados |
| `/dashboard/agenda` | Agenda |
| `/dashboard/relatorios` | Relatórios |
| `/dashboard/chatbot` | Chatbot |
| `/atendimento` | Atendimento (área específica) |
| `/admin/login` | Login do painel fornecedor |
| `/admin` | Dashboard admin |
| `/admin/escritorios` | Lista de tenants |
| `/admin/escritorios/[id]` | Detalhe/ licença do tenant |
| `/admin/licencas` | Visão de licenças |
| `/admin/planos` | Planos SaaS |

## Painel administrativo

Rotas sob `/admin/*` consomem a API **`/api/admin/*`** com autenticação de administrador (JWT admin). Ver [`apps/web/src/lib/admin-api.ts`](../apps/web/src/lib/admin-api.ts).

## Modo SaaS no browser

Para requisições à API em modo SaaS, o backend espera **subdomínio** ou header **`X-Tenant-ID`**. O front pode precisar de configuração adicional (proxy, variáveis por ambiente ou middleware Next) para enviar o tenant em todas as chamadas — validar cenário de deploy antes de ir a produção.
