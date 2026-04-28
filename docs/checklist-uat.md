# Checklist UAT — GestorAdv

Use este roteiro para testes manuais em homologação. Marque cada item. Anote data, versão/commit e evidências (prints, IDs).

**Ambiente:** URL do front ___ | URL da API ___ | Modo `DEPLOYMENT_MODE` ___

---

## 1. Infra e acesso

- [ ] `GET /api/health` retorna `status: ok`
- [ ] Swagger `/api/docs` abre
- [ ] Front `/login` carrega sem erro de console crítico
- [ ] `NEXTAUTH_URL` e `NEXT_PUBLIC_API_URL` coerentes com a URL usada no navegador

## 2. Autenticação (escritório)

- [ ] Login com usuário válido redireciona ao dashboard
- [ ] Login com senha errada exibe erro
- [ ] Rotas do dashboard sem token redirecionam ou falham como esperado
- [ ] Logout / limpeza de sessão (se aplicável)

## 3. Licenciamento

### Standalone

- [ ] Com escritório **sem** cadastro completo, rotas protegidas comportam-se conforme [`LicenseGuard`](../apps/api/src/escritorio/license.guard.ts) (incl. mensagem quando licença inválida)
- [ ] Tela Escritório / licença: trial ou ativação de chave
- [ ] Ferramenta [`tools/license-manager`](../tools/license-manager/README.md): gerar/validar chave (ambiente de teste)

### SaaS (`DEPLOYMENT_MODE=saas`)

- [ ] Tenant resolvido via **subdomínio** ou header **`X-Tenant-ID`**
- [ ] Licença inativa/expirada bloqueia operações esperadas
- [ ] Painel admin: login, listar tenants, gerar/renovar licença

## 4. Módulos principais (CRUD feliz)

Marque o que for escopo da release:

- [ ] **Usuários / advogados:** listar, criar (perfil admin)
- [ ] **Clientes:** listar, criar, editar
- [ ] **Processos:** listar, criar, abrir detalhe
- [ ] **Prazos:** listar, criar, alterar status
- [ ] **Tarefas:** listar, criar
- [ ] **Documentos / upload:** enviar arquivo, listar
- [ ] **Financeiro:** lançamentos e/ou contas a pagar
- [ ] **Relatórios:** gerar/visualizar principal relatório
- [ ] **Escritório:** dados cadastrais e aba **Integrações** (sem chaves de produção)
- [ ] **Atendimento:** fluxo interno e/ou formulário público (`/api/atendimento/...`)
- [ ] **Notificações:** listar / marcar lida
- [ ] **Chatbot:** resposta quando `ANTHROPIC_API_KEY` ausente (degradação) e com chave de **sandbox**

## 5. Integrações (somente sandbox / credenciais de teste)

- [ ] **WhatsApp:** webhook ou envio de teste (número de homologação)
- [ ] **Tribunais / DATAJUD:** consulta com chave de teste
- [ ] **E-mail:** envio SMTP/SendGrid para endereço de teste
- [ ] **Redis / filas:** alertas de prazos (se job configurado) — Redis disponível

## 6. Segurança e LGPD

- [ ] Dados de produção de terceiros **não** usados sem base legal
- [ ] Senhas padrão de **seed** alteradas ou ambiente isolado
- [ ] HTTPS em homologação pública (se exposto na internet)

## 7. Regressão rápida pós-deploy

- [ ] Smoke: login + 1 operação por módulo crítico
- [ ] Logs sem stack trace inesperado no servidor

---

**Responsável:** _________________ **Data:** _______
