# PRD-003: Performance e UX de Carregamento

**Status:** Pronto para Implementação
**Data:** 2026-05-18
**Versao:** 1.1

---

## O Que e Este PRD?

Cobre dois eixos de performance do whatrack:

**Eixo A — Performance Percebida (UX):** o usuario sente que o app e lento mesmo que o servidor seja rapido. Clique sem feedback visual, tela em branco durante navegacao, skeleton ausente.

**Eixo B — Performance Real (Servidor):** queries N+1, sequential awaits paralelizaveis, imagens sem otimizacao, over-fetching sem `select:`.

---

## Estrutura

```txt
PRD-003-performance/
├── README.md         (este arquivo)
├── CONTEXT.md        (contexto tecnico e inventario de problemas)
├── DIAGNOSTIC.md     (localizacoes especificas com severidade)
├── TASKS.md          (plano de implementacao em fases)
└── QUICK_START.md    (resumo para comecar imediatamente)
```

---

## Resumo Executivo

### Problema Principal (reportado pelo usuario)

> "Clicamos em algum botao, a tela demora demais para fazer o redirect. O usuario fica clicando varias vezes pensando que nao funcionou."

Raiz: navegacoes via `router.push()` sem feedback imediato. O Next.js App Router pre-faz o fetch da rota destino antes de navegar — durante esse tempo (100-800ms) o botao nao mostra nada.

### Impacto por Categoria

| Categoria | Severidade | Usuarios Afetados |
|-----------|------------|-------------------|
| Clique sem feedback (topbar, sidebar) | 🔴 Critico | 100% |
| Paginas sem loading.tsx (31 rotas) | 🔴 Critico | 100% |
| Skeleton ausente (fallback vazio) | 🟡 Moderado | 100% |
| N+1 queries (ticket stages, slug loop) | 🔴 Critico | Admin/onboarding |
| `images: unoptimized` | 🟡 Moderado | 100% |
| Sequential awaits paralelizaveis | 🟡 Moderado | Billing, whatsapp |

---

## Fases

### Fase 1 — UX Imediata (Percebida) — 6-8h

- T1: Feedback instantaneo em navegacoes e acoes (`useTransition`, spinner, disabled)
- T2: `loading.tsx` para as 31 rotas dashboard sem skeleton
- T3: Skeleton screens (shadcn) para paginas-chave

### Fase 2 — Performance Real — 4-6h

- T4: Fix N+1 (ticket stages + slug generation)
- T5: Remover `images: { unoptimized: true }` e migrar img para next/image
- T6: Paralelizar sequential awaits em billing e whatsapp

### Fase 3 — Otimizações Refinadas — 2-3h

- T7: Virtualização de listas longas (`sales-list`)
- T8: Implementação piloto de `'use cache'` (Next.js 16)

### Fase 4 — Next.js Power User (Experiência Premium) — 4-6h

- T9: Streaming Granular com `Suspense` em nível de componente
- T10: Migração de mutações API para Server Actions
- T11: Atualizações otimistas na UI com `useOptimistic`
- T12: Habilitação experimental do Partial Prerendering (PPR)

---

## Criterio de Conclusao

- [ ] Todos os botoes que disparam async acao ou navegacao dao feedback visual imediato (< 50ms)
- [ ] Todas as 31 rotas dashboard tem `loading.tsx`
- [ ] Nenhum `for...of await` ou loop com query sequencial existe no projeto
- [ ] `images: { unoptimized: true }` removido e `remotePatterns` configurado
- [ ] Build passa sem erros
