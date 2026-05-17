# Context: Arquitetura por Feature no Whatrack

**Ultima atualizacao:** 2026-05-17

---

## 📌 Definicao

A migracao para arquitetura por feature organiza o sistema por dominio funcional, com separacao forte entre HTTP, regra de negocio e acesso a dados.

**O que e:**

- Reorganizacao estrutural e incremental por dominio.
- Padronizacao do fluxo `route/action -> service -> repository`.
- Endurecimento de boundaries server/client e validacao de input.

**O que NAO e:**

- Reescrita total de UI.
- Mudanca de regra de negocio de produto, salvo ajustes necessarios de arquitetura.

---

## 🔄 Fluxo Completo

```txt
Client Component
  ↓
TanStack Query (query/mutation)
  ↓
API Route (camada HTTP)
  ↓
Service (server-only, input unknown + schema.parse)
  ↓
Repository (server-only, db)
  ↓
Prisma/PostgreSQL
```

Etapa 1, client consome endpoint e envia input sem confiar no tipo de runtime.
Etapa 2, route autentica/autoriza, delega para service e retorna resposta.
Etapa 3, service valida com schema, aplica regra de negocio e chama repository.
Etapa 4, repository executa operacao pontual no banco.

---

## 💾 Dados Armazenados

### Banco de dados

- Modelos no `prisma/schema.prisma`.
- IDs majoritariamente gerados no banco com `gen_random_uuid()`.

### Camadas atuais relevantes

- `src/app/api/**/route.ts`
- `src/services/**`
- `src/schemas/**`
- `src/server/**`

---

## 🎯 Estados

```txt
estado-atual
  ↓
fundacao-padrao
  ↓
dominios-migrados
  ↓
hardening-final
```

### Estados Detalhados

#### estado-atual

- Services concentram regra + db.
- Sem `src/features`.

#### fundacao-padrao

- Estrutura base por feature criada.
- Guardrails de lint/import e templates prontos.

#### dominios-migrados

- Dominios migrados por ondas, sem quebrar contratos.

#### hardening-final

- Regras de arquitetura automatizadas em CI.

---

## 🔗 Integracao com Outros Dominios

### Arquitetura ← Auth e Contexto

Auth e escopo de organizacao/projeto continuam em `src/server/**`, consumidos por routes/actions/services.

### Arquitetura → Todos os Dominios

Cada dominio passa a expor API publica em `features/[domain]/index.ts`, reduzindo acoplamento lateral.

---

## 📊 Exemplo Real: Flow Completo

Exemplo atual em `items`:
- Route valida payload e chama `src/services/items/item.service.ts`.
- Service usa `prisma` diretamente.

Exemplo alvo em `items`:
- `src/features/items/services/create-item.service.ts` recebe `unknown` e valida.
- `src/features/items/repositories/create-item.repository.ts` persiste.
- Route apenas compoe auth, contexto e resposta HTTP.

---

## 📋 Validacoes

### Input Validation

- Todo input de route/action deve entrar como `unknown` no service.
- Validacao via schema da feature, sem parse duplicado em multiplas camadas.

### Business Logic Validation

- Regras de ownership e escopo por organizacao/projeto no service.
- Repository sem regra de negocio.

---

## 🔐 Permissoes

| Acao | Quem Pode | Condicao |
|------|-----------|----------|
| Ler/escrever dominio | Usuario autenticado | `validateFullAccess` ou helper equivalente |
| Acao administrativa | Owner/Admin | validacao de permissao explicita |

---

## 🎯 Por Que Isso e Critico?

- Reduz regressao e custo de manutencao.
- Permite escalar equipe por ownership de dominio.
- Melhora testabilidade e previsibilidade de mudanca.

---

## 📝 Resumo para Implementacao

- Primeiro criar fundacao comum.
- Depois migrar dominios com maior impacto de negocio e volume de mudanca.
- Finalizar com dominios perifericos e hardening em CI.
