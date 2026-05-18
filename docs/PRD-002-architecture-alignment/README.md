# PRD-002: Architecture Alignment (Alinhamento com SKILL.md)

**Status:** Draft
**Data:** 2026-05-18
**Versao:** 1.0

---

## 📋 O Que e Este PRD?

Este PRD define as correcoes necessarias para alinhar o projeto ao `.agents/skills/next-feature-architecture/SKILL.md`.

A estrutura `src/features/[domain]` ja existe com 25 dominios migrados. O PRD-001 cobriu a migracao inicial. Este PRD cobre as violacoes que restaram apos essa migracao, identificadas em auditoria de 2026-05-18.

**Documento:** lista de problemas concretos com localizacao exata, criterios de aceitacao e ordem de execucao.

**Tempo Total:** 3-5 dias

---

## 📂 Estrutura do PRD

```txt
PRD-002-architecture-alignment/
├── README.md (este arquivo)
├── CONTEXT.md (estado atual do projeto e alvo)
├── DIAGNOSTIC.md (violacoes por severidade com localizacao exata)
├── TASKS.md (plano de execucao task a task)
└── QUICK_START.md (guia rapido para comecar)
```

---

## 🎯 Resumo Executivo

### Status Atual

- Estrutura `src/features/[domain]` criada com 25 dominios.
- `src/services/` reducido a 4 entradas legadas (audit, billing, delivery, mail).
- `src/proxy.ts` correto para Next.js 16+.
- Porem: 7 categorias de violacoes ao SKILL.md identificadas na auditoria.

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 2     | 🟡 4      | 🟢 1   |

### Ordem de Fixacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Criticos | T1, T2 | 2-3 dias |
| 2: Robustez | T3, T4, T5, T6 | 4-6h |
| 3: Melhorias | T7 | 30min |

**Total:** 3-5 dias

---

## 🔴 Problemas Criticos

### T1: `import "server-only"` ausente em services e repositories

**Impacto:** codigo server sem guardrail pode ser importado por client components, expondo dados sensiveis, acesso ao banco e segredos.
**Solucao:** adicionar `import "server-only"` na linha 1 de 97 services e 4 repositories via script + verificacao de build.

### T2: `prisma` importado diretamente em `app/api` e `app/pages`

**Impacto:** 20 arquivos em `src/app/` acessam banco sem passar por service ou repository, quebrando o fluxo de camadas.
**Solucao:** extrair logica para service/repository existente ou novo, e delegacao via route.

---

## 🟡 Problemas Moderados

### T3: `nanoid` proibido em `features/organizations`

**Impacto:** geracao de slug com `nanoid` viola regra 16 do SKILL.md.
**Solucao:** substituir por logica deterministicaa ou, se precisar de aleatoriedade, documentar excecao formal.

### T4: `features/analytics/index.ts` exporta services

**Impacto:** `index.ts` exporta `./services/index`, expondo camada server-only como API publica da feature, quebrando a regra de exports publicos.
**Solucao:** remover export de services do `index.ts` e expor apenas hooks, components, types e schemas.

### T5: Helper `getCurrentUserId` ausente

**Impacto:** logica de autenticacao nao centralizada conforme SKILL.md; cada action acessa session de formas diferentes.
**Solucao:** criar `src/server/auth/get-current-user-id.ts` que encapsula `getServerSession`.

### T6: `src/services/` com 4 entradas legadas nao migradas

**Impacto:** `audit`, `billing`, `delivery`, `mail` ainda fora de `src/features/`, parcialmente fora do padrao.
**Solucao:** avaliar destino de cada uma e migrar ou declarar como infra compartilhada.

---

## 🟢 Problemas Menores

### T7: Caminho do banco diverge do SKILL.md

**Impacto:** SKILL.md define `src/server/db/db.ts`; projeto usa `src/lib/db/prisma.ts`. Divergencia de documentacao.
**Solucao:** atualizar SKILL.md para refletir caminho real, ou criar alias.

---

## 💾 Arquivos Principais

- `src/features/*/services/*.ts` - 97 arquivos sem `server-only`
- `src/features/*/repositories/*.ts` - 4 arquivos sem `server-only`
- `src/app/api/v1/billing/subscription/route.ts` - prisma direto
- `src/app/api/v1/billing/subscription/status/route.ts` - prisma direto
- `src/app/api/v1/billing/subscription/retry/route.ts` - prisma direto
- `src/app/api/v1/billing/checkout/[invoiceId]/status/route.ts` - prisma direto
- `src/app/api/v1/cron/whatsapp/campaign-dispatch/route.ts` - prisma direto
- `src/app/api/v1/cron/whatsapp/ab-winner-dispatch/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/add-audience/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/retry-failed/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/claim-waba/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/debug/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/onboarding/phone-number/route.ts` - prisma direto
- `src/app/api/v1/whatsapp/phone-numbers/[phoneId]/profile/route.ts` - prisma direto
- `src/app/api/v1/onboarding/setup/route.ts` - prisma direto
- `src/app/api/v1/projects/slug/route.ts` - prisma direto
- `src/app/api/v1/projects/current/route.ts` - prisma direto
- `src/app/api/v1/meta-ads/connect/route.ts` - prisma direto
- `src/app/(public)/checkout/page.tsx` - prisma direto
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx` - prisma direto
- `src/features/analytics/index.ts` - exporta services
- `src/features/organizations/services/organization-management.service.ts` - nanoid
- `src/server/auth/get-current-user-id.ts` - arquivo a criar
- `src/lib/db/prisma.ts` - caminho real do banco

---

## ✅ Como Comecar

1. Ler: CONTEXT.md, DIAGNOSTIC.md, QUICK_START.md, TASKS.md
2. Criar branch: `git checkout -b refactor/architecture-alignment`
3. Executar T1 primeiro (maior impacto, menor risco por ser aditivo)
4. Executar T2 por dominio (billing, whatsapp, projects, cron, meta-ads)
5. Executar T3-T6 em sequencia
6. Commitar por task com escopo do dominio

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1: server-only ausente | Alto | Alta | CRITICO | 2h |
| T2: prisma direto em routes | Alto | Alta | CRITICO | 2-3 dias |
| T3: nanoid em organizations | Medio | Baixa | MEDIO | 1h |
| T4: analytics/index exports services | Medio | Media | MEDIO | 30min |
| T5: getCurrentUserId ausente | Medio | Baixa | MEDIO | 30min |
| T6: services legados em src/services | Medio | Baixa | MEDIO | 2-3h |
| T7: caminho DB diverge | Baixo | Baixa | BAIXO | 30min |

---

**Status:** Draft pronto para execucao
