# Diagnostic: Problemas na Arquitetura por Feature

**Data:** 2026-05-17
**Status:** Draft
**Escopo:** `src/app/api`, `src/services`, `src/server`, `src/schemas`, `prisma/schema.prisma`

---

## 📋 Resumo Executivo

Arquitetura atual funcional para entrega de features, mas com baixa aderencia ao padrao alvo.

- 🔴 5 Criticos, ligados a separacao de camadas e boundary server.
- 🟡 6 Moderados, ligados a padronizacao, validação e governanca.
- 🟢 3 Menores, ligados a consistencia de naming e DX.

**Conclusao:** necessario programa de migracao incremental por dominio, com fundacao arquitetural antes de mover codigo de negocio.

---

## 🔴 Problemas Criticos

### 1. Ausencia de `src/features/[domain]`

**Problema:** dominios estao espalhados principalmente em `src/services`, `src/hooks`, `src/schemas`.

**Localizacao:** `src/services/**`, `src/schemas/**`, `src/app/api/**/route.ts`

**Impacto:**

- ❌ alto acoplamento entre modulos
- ❌ ownership tecnico pouco claro

**Solucao Necessaria:**

1. Criar estrutura base de feature.
2. Definir API publica por dominio com `index.ts`.
3. Migrar por ondas.

### 2. Repository layer inexistente

**Problema:** services acessam `prisma` direto.

**Localizacao:** `src/services/**`

**Impacto:**

- ❌ mistura regra de negocio com persistencia
- ❌ testes mais caros e refatoracao arriscada

**Solucao Necessaria:**

1. Extrair repositories por operacao.
2. Remover db direto dos services.

### 3. Route com acesso direto a banco

**Problema:** parte das rotas importa `@/lib/db/prisma`.

**Localizacao:** `src/app/api/**/route.ts`

**Impacto:**

- ❌ quebra de boundary HTTP
- ❌ duplicacao de regra

**Solucao Necessaria:**

1. Route deve delegar para service.
2. Remover imports de db em route.

### 4. Boundary server-only incompleto

**Problema:** poucos arquivos server com `import 'server-only'`.

**Localizacao:** `src/services/**`, `src/server/**`

**Impacto:**

- ❌ risco de uso indevido em client
- ❌ menor clareza de contrato de execucao

**Solucao Necessaria:**

1. Aplicar `server-only` em services/repositories server.
2. Validar por lint/CI.

### 5. Regra de IDs da skill violada em trechos

**Problema:** geracao local com `nanoid` para slug fallback e UUID em pontos de infra.

**Localizacao:** `src/services/organizations/organization-management.service.ts`, `src/proxy.ts`.

**Impacto:**

- ❌ inconsistencia com padrao declarado

**Solucao Necessaria:**

1. Definir politica final por tipo de identificador.
2. Ajustar geracoes locais onde aplicavel.

---

## 🟡 Problemas Moderados

### 6. Validacao concentrada em routes em varios fluxos

### 7. Padrao de service unico por dominio, com arquivos extensos

### 8. Imports profundos e cross-domain sem API explicita

### 9. Ausencia de guardrails automatizados para arquitetura

### 10. Inconsistencia entre API routes e possiveis Server Actions

### 11. Strategia de migracao de testes ainda nao formalizada

---

## 🟢 Problemas Menores

### 12. Naming heterogeneo entre pastas e arquivos

### 13. Barrel exports ausentes ou inconsistentes

### 14. Documentacao tecnica de ownership por dominio incompleta

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| Uso de TanStack Query | ✅ | varios hooks/componentes usam `useQuery`/`useMutation` |
| Uso de `src/proxy.ts` | ✅ | alinhado com diretriz Next.js 16+ |
| IDs no schema principal | ✅ | `prisma/schema.prisma` usa `gen_random_uuid()` |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Sem features por dominio | Alto | Alta | CRITICO | 1-2 semanas |
| Sem repositories | Alto | Alta | CRITICO | 1-2 semanas |
| Route com db direto | Alto | Media | CRITICO | 1 semana |
| Server boundary incompleto | Medio | Alta | MEDIO | 2-3 dias |
| IDs fora do padrao | Medio | Media | MEDIO | 1-2 dias |

---

## 🎯 Ordem de Fixacao

### Fase 1: Fundacao (1-2 semanas)

1. T1, estrutura e contratos da arquitetura
2. T2, guardrails em lint e CI
3. T3, templates por feature
4. T4, piloto de migracao

### Fase 2: Dominios core (3-4 semanas)

5. T5 `organizations`
6. T6 `projects`
7. T7 `items` + `item-categories`
8. T8 `leads` + `sales`

### Fase 3: Dominios de crescimento (3-4 semanas)

9. T9 `tickets` + `ticket-stages`
10. T10 `whatsapp`
11. T11 `meta-ads`
12. T12 `analytics` + `dashboard`

### Fase 4: Perifericos e hardening (3-4 semanas)

13. T13 `billing`
14. T14 `onboarding` + `company` + `contact` + `me`
15. T15 `system` + `cron` + `conversations` + `account`
16. T16 limpeza final e remocao de legado

**Total Estimado:** 10-14 semanas

---

## 📝 Proximos Passos

1. ✅ Aprovar ordem por dominio
2. ⬜ Aprovar criterios de pronto por fase
3. ⬜ Executar fase 1
4. ⬜ Iniciar migracao dos dominios core

---

**Status:** Draft pronto para kickoff tecnico.
