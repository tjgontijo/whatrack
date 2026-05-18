# Diagnostic: Violacoes de Alinhamento com SKILL.md

**Data:** 2026-05-18
**Status:** Draft
**Escopo:** `src/features/**`, `src/app/api/**`, `src/app/(dashboard)/**`, `src/app/(public)/**`, `src/services/**`

---

## 📋 Resumo Executivo

Estrutura `src/features/` ja existe com 25 dominios. A migracao estrutural do PRD-001 foi executada. Porem, auditoria de 2026-05-18 identificou 7 categorias de violacoes residuais ao SKILL.md:

- 🔴 2 Criticos: boundary server sem guardrail e acesso direto ao banco em rotas
- 🟡 4 Moderados: nanoid proibido, index.ts expondo services, helper de auth ausente, legados nao migrados
- 🟢 1 Menor: divergencia de documentacao no caminho do banco

**Conclusao:** o projeto precisa de 3-5 dias de trabalho focado para atingir conformidade total com o SKILL.md.

---

## 🔴 Problemas Criticos

### 1. `import "server-only"` ausente em 101 arquivos

**Problema:** services e repositories em `src/features/` nao tem `import "server-only"` na linha 1. Isso significa que o bundler do Next.js nao recebe garantia de que esses modulos sao server-only e pode incluí-los no bundle client se algum componente importar por engano.

**Localizacao:** `src/features/*/services/*.ts` e `src/features/*/repositories/*.ts`

**Contagem por dominio (services sem server-only):**

```txt
whatsapp:    31 arquivos
billing:     29 arquivos
meta-ads:    16 arquivos
dashboard:   10 arquivos
organizations: 10 arquivos
analytics:    6 arquivos
cron:         4 arquivos
onboarding:   4 arquivos
tickets:      3 arquivos
account:      2 arquivos
company:      2 arquivos
me:           2 arquivos
system:       2 arquivos
ticket-stages: 2 arquivos
contact:      1 arquivo
conversations: 1 arquivo
items:        1 arquivo
leads:        1 arquivo
projects:     1 arquivo
sales:        1 arquivo
Total:       97 services

Repositories sem server-only: 4 arquivos
```

**Impacto:**

- ❌ codigo de acesso ao banco pode ser empacotado no bundle client
- ❌ segredos de API e logica sensivel ficam expostos
- ❌ qualquer importacao acidental por componente client passa silenciosamente

**Solucao Necessaria:**

1. Criar script que adiciona `import "server-only"` na linha 1 de todos os arquivos afetados.
2. Executar build para detectar importacoes invalidas.
3. Corrigir componentes que importam services diretamente.

---

### 2. `prisma` importado diretamente em 20 arquivos de `src/app/`

**Problema:** 18 API routes e 2 arquivos de pagina/layout importam `@/lib/db/prisma` diretamente, executando queries sem passar por service ou repository. Isso quebra o fluxo de camadas e elimina validacao, regra de negocio isolada e testabilidade.

**Localizacao:** arquivos em `src/app/api/v1/` e `src/app/(dashboard)/`, `src/app/(public)/`

**Lista completa:**

```txt
src/app/api/v1/billing/subscription/route.ts
src/app/api/v1/billing/subscription/status/route.ts
src/app/api/v1/billing/subscription/retry/route.ts
src/app/api/v1/billing/checkout/[invoiceId]/status/route.ts
src/app/api/v1/cron/whatsapp/campaign-dispatch/route.ts
src/app/api/v1/cron/whatsapp/ab-winner-dispatch/route.ts
src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/route.ts
src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts
src/app/api/v1/whatsapp/campaigns/[campaignId]/add-audience/route.ts
src/app/api/v1/whatsapp/campaigns/[campaignId]/retry-failed/route.ts
src/app/api/v1/whatsapp/claim-waba/route.ts
src/app/api/v1/whatsapp/debug/route.ts
src/app/api/v1/whatsapp/onboarding/phone-number/route.ts
src/app/api/v1/whatsapp/phone-numbers/[phoneId]/profile/route.ts
src/app/api/v1/onboarding/setup/route.ts
src/app/api/v1/projects/slug/route.ts
src/app/api/v1/projects/current/route.ts
src/app/api/v1/meta-ads/connect/route.ts
src/app/(public)/checkout/page.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx
```

**Impacto:**

- ❌ fluxo Component -> Mutation -> Route -> Service -> Repository quebrado
- ❌ sem validacao de schema antes da query
- ❌ regra de negocio acoplada a camada HTTP
- ❌ dificil de testar sem banco de dados

**Solucao Necessaria:**

1. Para cada arquivo: identificar qual feature/dominio e responsavel.
2. Extrair logica de query para repository existente ou novo.
3. Criar ou chamar service existente no dominio correto.
4. Route passa a chamar service e retornar resultado.

---

## 🟡 Problemas Moderados

### 3. `nanoid` proibido em `features/organizations`

**Problema:** `organization-management.service.ts` usa `nanoid` para gerar sufixo de slug em fallback e deduplicacao. SKILL.md regra 16 proibe geracao de IDs no codigo.

**Localizacao:** `src/features/organizations/services/organization-management.service.ts:2,33,54`

```ts
import { nanoid } from 'nanoid'
// linha 33:
return normalizeSlug(name) || `org-${nanoid(10)}`
// linha 54:
return `${baseSlug}-${nanoid(6).toLowerCase()}`
```

**Impacto:**

- ⚠️ viola politica declarada de IDs
- ⚠️ inconsistencia com outros dominios

**Solucao Necessaria:**

1. Avaliar se slug e tecnicamente um "ID" no sentido da regra (presumido: sim, pois identifica a org na URL).
2. Se sim: substituir por alternativa sem biblioteca externa (contador de colisao, timestamp, sequencia).
3. Se nao: documentar excecao formal no SKILL.md ou em comentario no arquivo.

---

### 4. `features/analytics/index.ts` exporta `services`

**Problema:** `index.ts` da feature analytics contem `export * from './services/index'`, expondo toda a camada de services como API publica da feature. SKILL.md proibe exportar services de `index.ts`.

**Localizacao:** `src/features/analytics/index.ts:1`

```ts
export * from './services/index'     // ← VIOLACAO
export * from './hooks/use-dashboard-analytics'
```

**Impacto:**

- ⚠️ qualquer arquivo pode importar services server-only via import publico
- ⚠️ boundary server-only fica invisivel para quem usa `@/features/analytics`

**Solucao Necessaria:**

1. Remover `export * from './services/index'` do `index.ts`.
2. Verificar quais consumidores usam esse import e ajustar para import direto de `@/features/analytics/services/[arquivo]`.

---

### 5. `getCurrentUserId` ausente

**Problema:** SKILL.md exige `src/server/auth/get-current-user-id.ts` como helper padrao para autenticacao em Server Actions. O arquivo nao existe. `getOrSyncUser` e `getServerSession` em `server/auth/server.ts` existem mas nao seguem o contrato esperado pelas actions.

**Localizacao:** `src/server/auth/get-current-user-id.ts` - arquivo ausente

**Impacto:**

- ⚠️ actions sem padrao unico de autenticacao
- ⚠️ cada action pode resolver userId de forma diferente

**Solucao Necessaria:**

1. Criar `src/server/auth/get-current-user-id.ts` que encapsula `getOrSyncUser` ou `getServerSession`.
2. Retornar `userId: string` ou lancar erro padronizado se nao autenticado.

---

### 6. `src/services/` tem 4 entradas legadas nao migradas

**Problema:** `src/services/audit`, `billing`, `delivery`, `mail` nao foram movidas para `src/features/`. `src/features/billing` ja existe, entao `src/services/billing` pode ser duplicidade ou complemento.

**Localizacao:** `src/services/audit/`, `src/services/billing/`, `src/services/delivery/`, `src/services/mail/`

**Impacto:**

- ⚠️ legado fora da estrutura alvo
- ⚠️ confusao sobre onde importar codigo de billing e delivery

**Solucao Necessaria:**

1. Mapear o que cada pasta contem.
2. Decidir destino: mover para feature existente, criar nova feature, ou declarar como infra compartilhada em `src/server/`.
3. Atualizar imports.

---

## 🟢 Problemas Menores

### 7. Caminho do banco diverge do SKILL.md

**Problema:** SKILL.md define `src/server/db/db.ts` como localizacao do banco. O projeto usa `src/lib/db/prisma.ts`. Sem impacto funcional.

**Localizacao:** `src/lib/db/prisma.ts` (real) vs `src/server/db/db.ts` (SKILL.md)

**Impacto:**

- 🟢 apenas divergencia de documentacao
- 🟢 pode confundir quem ler o SKILL.md sem conhecer o projeto

**Solucao Necessaria:**

1. Atualizar SKILL.md para refletir caminho real (`src/lib/db/prisma.ts`), ou
2. Criar `src/server/db/db.ts` como re-export para alinhar com o padrao.

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| Estrutura `src/features/[domain]` | ✅ | 25 dominios existentes |
| `src/proxy.ts` para Next.js 16+ | ✅ | arquivo existe, `middleware.ts` ausente |
| IDs no schema principal | ✅ | `prisma/schema.prisma` usa `gen_random_uuid()` |
| TanStack Query em hooks | ✅ | varios hooks com `useQuery`/`useMutation` |
| Repositories separados por operacao | ✅ | ex: `sales/repositories/` com 5 arquivos especializados |
| `validateFullAccess` para auth em routes | ✅ | helper compartilhado em uso |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| server-only ausente (T1) | Alto | Alta | CRITICO | 2h |
| prisma direto em routes (T2) | Alto | Alta | CRITICO | 2-3 dias |
| nanoid em organizations (T3) | Medio | Baixa | MEDIO | 1h |
| analytics/index exports services (T4) | Medio | Media | MEDIO | 30min |
| getCurrentUserId ausente (T5) | Medio | Baixa | MEDIO | 30min |
| services legados em src/services (T6) | Medio | Baixa | MEDIO | 2-3h |
| caminho DB diverge (T7) | Baixo | Baixa | BAIXO | 30min |

---

## 🎯 Ordem de Fixacao

### Fase 1: Criticos (2-3 dias)

1. T1: adicionar `server-only` em 101 arquivos
2. T2: remover `prisma` direto de 20 arquivos em `app/`

### Fase 2: Robustez (4-6h)

3. T3: corrigir ou documentar `nanoid` em organizations
4. T4: limpar `analytics/index.ts`
5. T5: criar `getCurrentUserId` helper
6. T6: definir destino e migrar legados de `src/services/`

### Fase 3: Melhorias (30min)

7. T7: alinhar documentacao do caminho do banco

**Total Estimado:** 3-5 dias

---

## 📝 Proximos Passos

1. ✅ Revisar este DIAGNOSTIC.md
2. ⬜ Ler TASKS.md
3. ⬜ Criar branch `refactor/architecture-alignment`
4. ⬜ Executar T1 (aditivo, menor risco)
5. ⬜ Executar T2 por grupo de dominio (billing, whatsapp, projects, cron, meta-ads)
6. ⬜ Executar T3 a T6
7. ⬜ Executar T7

---

**Status:** Draft pronto para execucao
