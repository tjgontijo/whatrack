# Context: Estado Atual da Arquitetura e Alvo

**Ultima atualizacao:** 2026-05-18

---

## 📌 Definicao

Este PRD cobre o alinhamento fino entre o codigo atual e o contrato definido em `.agents/skills/next-feature-architecture/SKILL.md`.

**O que e:**

- Correcoes de violacoes que permanecem apos a migracao estrutural (PRD-001)
- Auditoria especifica de arquivos, linhas e categorias de problema
- Plano de execucao operacional para fechar os gaps restantes

**O que NAO e:**

- Migracao de dominios (isso foi PRD-001)
- Reescrita de features
- Mudanca de tecnologia (ORM, autenticacao, etc.)

---

## 🔄 Fluxo Alvo Definido pelo SKILL.md

```txt
Component
  chama hook, query ou mutation

Mutation ou Query
  chama API route ou Server Action

Server Action
  "use server"
  pega userId com getCurrentUserId()
  chama service passando input unknown

Service
  "server-only"
  valida input com schema (parse)
  aplica regra de negocio
  chama repository

Repository
  "server-only"
  acessa db (prisma)

src/lib/db/prisma.ts
  fornece conexao com banco
```

---

## 📁 Estado Atual das Camadas

### `src/features/` - 25 dominios existentes

```txt
account, analytics, billing, campaigns, catalog, company,
contact, conversations, cron, dashboard, integrations,
item-categories, items, leads, me, meta-ads, onboarding,
organizations, projects, sales, settings, system,
ticket-stages, tickets, whatsapp
```

Status: estrutura criada. Violacoes de qualidade presentes.

### `src/services/` - 4 entradas legadas

```txt
audit/
billing/
delivery/
mail/
```

Status: nao migradas para features. Papel a definir.

### `src/server/auth/` - helpers de autenticacao

Arquivos existentes:
- `server.ts` - `getServerSession`, `getOrSyncUser`, `getCurrentOrganizationId`
- `server-session.ts` - sessao do servidor
- `validate-organization-access.ts` - validacao de acesso
- `require-workspace-page-access.ts` - guard de pagina
- `password-change.ts` - troca de senha

Ausente: `get-current-user-id.ts` (exigido pelo SKILL.md)

### `src/lib/db/prisma.ts` - conexao real com banco

SKILL.md define o caminho como `src/server/db/db.ts`. O projeto usa `src/lib/db/prisma.ts`. Divergencia apenas de documentacao. Funcional.

---

## 🔄 Fluxo Atual (com violacoes)

```txt
Component
  chama hook ou mutation

Mutation
  chama API route

API Route
  importa prisma direto  ← VIOLACAO T2
  ou chama service       ← correto

Service
  acessa prisma direto   ← permitido temporariamente
  mas sem server-only    ← VIOLACAO T1

Repository
  sem server-only        ← VIOLACAO T1 (4 arquivos)
```

---

## 🔐 Permissoes e Auth

| Operacao | Helper atual | Helper alvo |
|----------|-------------|-------------|
| Obter userId de server action | `getOrSyncUser(request)` ou inline | `getCurrentUserId()` |
| Validar acesso a organizacao | `validateFullAccess(request)` | manter |
| Guard de pagina | `requireWorkspacePageAccess(...)` | manter |

---

## 🎯 Por Que Isso e Critico?

- `server-only` ausente: Next.js pode empacotar codigo server no bundle client se algum componente importar por engano, expondo queries ao banco, segredos e logica de negocio sensivel.
- `prisma` direto em routes: sem service, nao ha validacao de schema, nao ha regra de negocio isolada, e o teste fica acoplado ao banco.
- `nanoid` em services: viola politica de geraçao de IDs do SKILL.md.

---

## 📝 Resumo para Implementacao

- T1 pode ser automatizado: script que adiciona `import "server-only"` na linha 1 de todos os `*/services/*.ts` e `*/repositories/*.ts` em `src/features/`.
- T1 pode causar erros de build se algum component importar service diretamente - isso deve ser tratado como bug a corrigir, nao como motivo para reverter.
- T2 requer analise arquivo a arquivo: algumas routes tem queries simples (extrair para repository), outras tem logica complexa (extrair para service).
- T3, T4, T5, T6 sao mudancas pequenas e independentes.
- T7 e decisao de documentacao, nao de codigo.
