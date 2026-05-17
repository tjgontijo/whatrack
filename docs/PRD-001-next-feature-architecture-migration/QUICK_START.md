# Quick Start: PRD-001 Feature Architecture Migration

**TL;DR:** migracao incremental para arquitetura por feature em 4 fases. 16 tasks, 5 criticas indiretas de fundacao. Total estimado 10-14 semanas.

---

## 📊 Resumo dos Problemas

| # | Problema | Severidade | Fix |
|---|----------|------------|-----|
| T1 | Sem `features/[domain]` | 🔴 Critico | criar fundacao e migrar por ondas |
| T2 | Sem repositories | 🔴 Critico | extrair acesso a db por operacao |
| T3 | Route com db direto | 🔴 Critico | route delega para service |
| T4 | `server-only` inconsistente | 🟡 Moderado | aplicar e validar em CI |
| T5 | IDs fora da regra da skill | 🟡 Moderado | alinhar politica de ID por contexto |

---

## 🔴 Criticos Primeiro

### T1-T4: Fundacao + piloto

**Como testar:**

```bash
npm run lint
npm run test
npm run build
# Esperado: sem import de db em route no dominio piloto, testes verdes
```

**Regra de fechamento por task/dominio:**

```bash
npm run lint
npm run test
npm run build
git add -A
git commit -m "refactor(<domain>): <task-id> <resumo>"
```

Se `test` ou `build` bloquearem por ambiente, registrar o bloqueio no PR e no PRD antes do commit.

---

## 📂 Ordem por Dominio

1. Fundacao e piloto: `items`
2. Core: `organizations`, `projects`, `item-categories`, `leads`, `sales`
3. Crescimento: `tickets`, `ticket-stages`, `whatsapp`, `meta-ads`, `analytics`, `dashboard`
4. Perifericos: `billing`, `onboarding`, `company`, `contact`, `me`, `system`, `cron`, `conversations`, `account`

---

## 📂 Arquivos Principais

- `src/app/api/**/route.ts` - camada HTTP
- `src/services/**` - legado a migrar
- `src/features/**` - camada alvo
- `src/schemas/**` - validacao
- `prisma/schema.prisma` - politicas de dados

---

## 🚀 Comecar

```bash
git checkout -b chore/feature-architecture-foundation
npm run lint
npm run test

# Executar T1
# Executar T2
# Executar T3
# Executar T4

git add -A
git commit -m "chore(architecture): T1-T4 bootstrap feature-based foundation"
```

Sugestao de branches por fase:
- `chore/feature-architecture-foundation`
- `refactor/domain-core-migration`
- `refactor/domain-growth-migration`
- `refactor/domain-peripheral-migration`

---

**Status:** Draft, pronto para kickoff.
