# Quick Start: PRD-007 Kanban Pipefy-Style

**TL;DR:** Primeiro corrija layout e DnD, depois contrato de dados e card. São 8 tasks: 2 críticas, 4 moderadas e 2 menores. Total: 13h - 15h.

---

## 📊 Resumo das Tasks

| # | Problema | Severidade | Fix |
|---|----------|------------|-----|
| T1 | Scroll da página compete com board | 🔴 Crítico | Customizar `HeaderPageShell` e travar viewport do Kanban |
| T2 | Coluna vazia não é droppable explícita | 🔴 Crítico | Usar `useDroppable` por coluna |
| T3 | Header do Kanban é hardcoded | 🟡 Moderado | Adicionar render props e tipos opcionais |
| T4 | Card não recebe todos os dados corretos | 🟡 Moderado | Expor `stageEnteredAt` e tipar `tracking` |
| T5 | Card pouco escaneável | 🟡 Moderado | Redesenhar `DealKanbanCard` |
| T6 | Total por stage pode ser parcial | 🟡 Moderado | Criar agregado server-side |
| T7 | Add stage inline indefinido | 🟢 Menor | Reusar fluxo existente de stages |
| T8 | Testes insuficientes | 🟢 Menor | Cobrir shell, Kanban e QA visual |

---

## 🔴 Críticos Primeiro

### T1: Viewport fixa do Kanban

**Como testar:**

```txt
1. Abrir /[organizationSlug]/[projectSlug]/deals.
2. Selecionar view Kanban.
3. Criar ou simular uma coluna com muitos cards.
4. Rolar a coluna.
```

**Esperado:** o header da página fica fixo, o board não cria scroll vertical externo e a coluna faz scroll interno.

### T2: Drop em coluna vazia

**Como testar:**

```txt
1. Abrir Kanban com ao menos uma coluna vazia.
2. Arrastar um card para a coluna vazia.
3. Soltar no centro da coluna, não sobre outro card.
```

**Esperado:** `PATCH /api/v1/deals/[dealId]` recebe o novo `stageId` e o card fica na coluna após refetch.

---

## 📂 Arquivos Principais

- `src/features/dashboard/components/layout/header-page-shell.tsx` - body/content precisam aceitar classes customizadas.
- `src/features/dashboard/components/crud/crud-kanban-view.tsx` - DnD, colunas, scroll interno e render props.
- `src/features/dashboard/components/crud/types.ts` - contrato de `KanbanColumn`.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx` - card, filtros, stats e integração.
- `src/features/deals/services/deal.service.ts` - campos de deals e agregados por stage.
- `src/features/deal-stages/services/deal-stage.service.ts` - dados de stages.
- `src/components/ui/scroll-area.tsx` - scroll interno das colunas.
- `public/pipefy/` - referências visuais locais.

---

## 🚀 Começar

```bash
git checkout -b feature/kanban-pipefy-style

# T1
npm run test -- src/features/dashboard/components/layout/__tests__/header-page-shell.test.tsx

# T2 e T3
npm run test -- src/features/dashboard/components/crud

# T4 e T6
npm run test -- src/features/deals/services/__tests__/deal.service.test.ts

# Validação geral
npm run lint
```

---

## ✅ Checklist de Execução

- [ ] T1 implementado antes de mexer no visual.
- [ ] T2 validado com coluna vazia.
- [ ] T3 mantém fallback do header atual.
- [ ] T4 não usa `any` para `tracking`.
- [ ] T5 não quebra textos longos.
- [ ] T6 não soma apenas página carregada, exceto se a UI declarar isso.
- [ ] T7 não duplica lógica de stage.
- [ ] T8 cobre testes e QA manual light/dark.

---

## ⚠️ Decisões Antes de Implementar

1. Somatório no header: recomendado ser total server-side por stage.
2. Descrição de stage: fora do PRD, porque não existe `description` em `DealStage`.
3. Add stage inline: depende do fluxo do PRD-006 para ficar completo.
4. Extração do card: extrair `DealKanbanCard` para `features/deals/components` se a página ficar grande.

---

## Commits Sugeridos

```bash
git commit -m "feat(kanban): isolate deals board viewport"
git commit -m "fix(kanban): support dropping deals into empty stages"
git commit -m "feat(deals): add kanban card metadata and stage metrics"
git commit -m "test(kanban): cover board layout behavior"
```

---

**Status:** pronto para execução.
