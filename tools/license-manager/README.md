# GestorAdv License Manager

Ferramenta externa para gerar, validar e gerenciar licenças do GestorAdv.

## Pré-requisitos

- Node.js 18+
- Acesso ao PostgreSQL do sistema (para operações diretas no banco)

## Instalação

```bash
cd tools/license-manager
npm install pg
```

## Uso

### Gerar nova licença (30 dias)
```bash
node license-manager.js generate --cnpj 12345678000190
node license-manager.js generate --cnpj 12345678000190 --dias 30 --plano professional
```

### Validar uma chave existente
```bash
node license-manager.js validate --cnpj 12345678000190 --chave GA-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
```

### Listar todas as licenças
```bash
node license-manager.js list
```

### Renovar licença (gera nova chave e atualiza banco)
```bash
node license-manager.js renew --cnpj 12345678000190
node license-manager.js renew --cnpj 12345678000190 --dias 30
```

### Revogar licença
```bash
node license-manager.js revoke --cnpj 12345678000190
```

### Ver informações completas
```bash
node license-manager.js info --cnpj 12345678000190
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://gestoradv:gestoradv_dev@localhost:5432/gestoradv` |

## Fluxo de Licenciamento

```
1. Admin cadastra escritório (CNPJ) → licença TRIAL (30 dias) automática
2. Após 30 dias → sistema exige nova chave
3. Operador externo roda: node license-manager.js generate --cnpj XXXXX
4. Chave é entregue ao admin do escritório
5. Admin insere chave na tela Escritório > Licença
6. Licença renovada por mais 30 dias
7. Repete a cada 30 dias
```

## Algoritmo de Chaves

As chaves são geradas usando HMAC-SHA256 com:
- Um segredo mestre (hardcoded na ferramenta e no backend)
- O CNPJ limpo (somente dígitos)
- O período de validade (YYYY-MM)

Isso garante que cada chave é:
- Única por CNPJ
- Válida apenas para um período específico (mês)
- Verificável localmente sem internet
- Determinística (mesma entrada = mesma saída)
