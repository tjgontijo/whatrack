# PRD-004: Next.js 16 Alignment

**Status:** Pendente
**Data:** 2026-05-18
**Versao:** 1.0

---

## 📋 O Que e Este PRD?

Este PRD cobre a adequacao do projeto whatrack as convencoes do Next.js 16, corrigindo tres categorias de violacao identificadas apos auditoria: ausencia de validacao centralizada de env vars, 50 arquivos com `force-dynamic` redundante, e zero uso de `"use cache"` em dados cacheáveis.

**Documento:** plano de implementacao com 3 tasks em 2 fases.

**Tempo Total:** 4-6 horas

---

## 📂 Estrutura do PRD

```txt
PRD-004-nextjs16-alignment/
├── README.md (este arquivo)
├── CONTEXT.md (o que mudou no Next.js 16 e impacto no projeto)
├── DIAGNOSTIC.md (problemas identificados com localizacoes)
├── TASKS.md (plano de implementacao)
└── QUICK_START.md (guia rapido)
```

---

## 🎯 Resumo Executivo

### Status Atual

- `src/lib/env.ts` nao existe — 29 variaveis de ambiente acessadas via `process.env` direto em ~25 arquivos sem validacao no boot
- 50 arquivos com `export const dynamic = "force-dynamic"` — redundante no Next.js 16 (dinamico por padrao)
- Nenhum uso de `"use cache"` — dados publicos como billing plans sao buscados a cada request sem cache

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 0 | 🟡 2 | 🟢 1 |

### Ordem de Fixacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Robustez | T1, T2 | 3-4h |
| 2: Performance | T3 | 1-2h |

**Total:** 4-6 horas

---

## 🟡 Problemas Moderados

### T1: Centralizar env vars em `src/lib/env.ts`

**Impacto:** Segredos como `ASAAS_API_KEY`, `BETTER_AUTH_SECRET`, `META_APP_SECRET` acessados sem validacao — aplicacao sobe silenciosamente com secrets faltando e falha em runtime, dificil de diagnosticar.
**Solucao:** Criar `src/lib/env.ts` com schema Zod, migrar todos os 25 arquivos para importar de `env`.

### T2: Remover `force-dynamic` redundante

**Impacto:** 50 arquivos com ruido semantico enganoso — dev pode assumir que a remocao tornaria o endpoint estatico, quando na verdade Next.js 16 ja e dinamico por padrao.
**Solucao:** Remover `export const dynamic = "force-dynamic"` de todos os API routes. Manter apenas em pages que precisem garantir comportamento dinamico explicitamente apos adicao de cache.

---

## 🟢 Problemas Menores

### T3: Adicionar `"use cache"` em endpoints publicos

**Impacto:** Dados que raramente mudam (billing plans, config publica) sao buscados do banco a cada request.
**Solucao:** Adicionar `"use cache"` + `cacheLife` + `cacheTag` em 3-5 repositories/services identificados como cacheáveis.

---

## 💾 Arquivos Principais

- `src/lib/env.ts` - a criar — hub central de env vars validadas
- `src/features/billing/services/asaas-config.service.ts` - maior consumidor de `process.env`
- `src/features/whatsapp/services/meta-cloud.service.ts` - 5 acessos diretos
- `src/app/api/v1/billing/plans/route.ts` - candidato primario a cache
- `src/features/billing/services/billing-plan-catalog.service.ts` - service do endpoint acima

---

## ✅ Como Comecar

1. Ler: CONTEXT.md, DIAGNOSTIC.md, QUICK_START.md, TASKS.md
2. Criar branch: `git checkout -b refactor/nextjs16-alignment`
3. T1 primeiro (env.ts) — T2 e T3 dependem do env criado
4. Build apos cada task
5. Commit por task

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 - env.ts | Medio | Alta | MEDIO | 2-3h |
| T2 - force-dynamic | Baixo | Baixa | BAIXO | 30min |
| T3 - use cache | Medio | Baixa | BAIXO | 1-2h |

---

**Status:** Pronto para execucao
