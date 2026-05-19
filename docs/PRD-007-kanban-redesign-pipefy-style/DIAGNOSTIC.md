# Diagnostic: Problemas no Kanban de Negociações

**Data:** 2026-05-19
**Status:** Análise revisada
**Escopo:** frontend, UX, contrato de dados e integração do board

---

## 📋 Resumo Executivo

O Kanban atual já tem a base certa: componente genérico, DnD com `dnd-kit`, stages vindas da API e cards renderizados pela página de deals. O problema principal não é falta de biblioteca, mas desalinhamento entre layout, drop zones, dados disponíveis e experiência Pipefy.

Foram identificados 8 problemas:

- 🔴 2 críticos: viewport/scroll e drop em coluna vazia.
- 🟡 4 moderados: API de composição do Kanban, contrato do card, redesign do card e métricas por stage.
- 🟢 2 menores: ações inline de stage e cobertura de testes.

**Conclusão:** implementar primeiro a estrutura de altura fixa e o DnD confiável. Depois evoluir o contrato do componente e dos dados antes de redesenhar o card.

---

## 🔴 Problemas Críticos

### 1. O scroll do board compete com o scroll da página

**Problema:** `HeaderPageShell` envolve o conteúdo em `flex-1 overflow-y-auto` e aplica `px-6 py-6` em um content interno. `CrudKanbanView` também tenta usar `h-full` e scroll horizontal. O resultado é um board que não controla sozinho a altura da viewport.

**Localização:** `src/features/dashboard/components/layout/header-page-shell.tsx` e `src/features/dashboard/components/crud/crud-kanban-view.tsx`

**Impacto:**

- ❌ Cabeçalhos de stage podem sair da referência visual quando o usuário navega em listas longas.
- ❌ Scroll vertical da página prejudica a sensação de board fixo.
- ❌ O comportamento diverge da referência `public/pipefy/pipefy.png`.

**Solução Necessária:**

1. Adicionar props opcionais em `HeaderPageShell`, por exemplo `bodyClassName` e `contentClassName`.
2. Em `DealsPage`, aplicar classes especiais quando `view === 'kanban'`.
3. Em `CrudKanbanView`, garantir `h-full min-h-0 overflow-hidden` no wrapper principal.
4. Usar `ScrollArea` ou viewport equivalente apenas dentro da lista de cards da coluna.

---

### 2. Colunas não são droppable zones explícitas

**Problema:** `handleDragEnd` verifica se `over.id` é uma coluna, mas `KanbanColumnComponent` não usa `useDroppable`. Na prática, o DnD tende a funcionar sobre cards existentes, mas fica frágil sobre áreas vazias ou colunas sem cards.

**Localização:** `src/features/dashboard/components/crud/crud-kanban-view.tsx`

**Impacto:**

- ❌ Mover deal para coluna vazia pode falhar.
- ❌ Drop em área livre da coluna pode não resolver o `toColumnId`.
- ❌ O redesign pode mascarar o bug se apenas mudar classes visuais.

**Solução Necessária:**

1. Registrar cada coluna com `useDroppable({ id: column.id })`.
2. Aplicar `setNodeRef` no corpo droppable da coluna.
3. Manter `SortableContext` para os cards.
4. Testar drop em coluna vazia, coluna com cards e área abaixo do último card.

---

## 🟡 Problemas Moderados

### 3. `CrudKanbanView` não expõe renderização suficiente para header estilo Pipefy

**Problema:** o header da coluna é hardcoded dentro do componente genérico. Para suportar valor total, menu de stage, contador, cor, ações e estado vazio com boa separação, a API precisa aceitar render props ou slots.

**Localização:** `src/features/dashboard/components/crud/crud-kanban-view.tsx` e `src/features/dashboard/components/crud/types.ts`

**Impacto:**

- ⚠️ Risco de inserir regra de deals dentro de um componente compartilhado.
- ⚠️ Dificuldade de reutilizar Kanban em outros domínios.
- ⚠️ Menus e métricas podem virar implementação rígida.

**Solução Necessária:**

1. Criar props opcionais como `renderColumnHeader`, `renderColumnActions` ou `getColumnMeta`.
2. Manter o fallback atual para usos existentes.
3. Atualizar `KanbanColumn` com campos opcionais que a API já retorna, como `dealsCount`, `isDefault`, `isClosed`.

---

### 4. Dados necessários para card Pipefy não estão completos no contrato da tela

**Problema:** o card desejado precisa mostrar origem, tempo na fase e último contato. `tracking` é mapeado no serviço, mas não aparece no tipo `DealItem`. `stageEnteredAt` existe no banco, mas não é selecionado nem retornado.

**Localização:** `src/features/deals/services/deal.service.ts` e `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**Impacto:**

- ⚠️ Origem pode ficar invisível ou depender de campo errado.
- ⚠️ Tempo na fase vira estimativa com `createdAt`, que mede vida do deal, não tempo parado.
- ⚠️ O card pode parecer completo, mas transmitir informação incorreta.

**Solução Necessária:**

1. Adicionar `stageEnteredAt` ao `dealListSelect`.
2. Mapear `stageEnteredAt` para ISO string.
3. Declarar `tracking` no tipo `DealItem`.
4. Definir fallback de origem: `utmSource`, `sourceType`, `originatedFrom` se exposto, ou `source`.

---

### 5. Card atual é funcional, mas pouco escaneável

**Problema:** `DealKanbanCard` mostra informações básicas, mas ainda não prioriza leitura rápida por valor, origem, responsável e inatividade.

**Localização:** `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**Impacto:**

- ⚠️ Usuário demora mais para identificar deals urgentes.
- ⚠️ Valor e atividade competem visualmente.
- ⚠️ O card não aproveita os padrões de card da referência Pipefy.

**Solução Necessária:**

1. Redesenhar o card com raio menor, borda sutil e fundo `bg-card`.
2. Usar acento visual com a cor da stage sem poluir o card.
3. Mostrar nome, telefone, origem, valor, tempo na fase e último contato.
4. Garantir que o card funcione em light e dark mode.

---

### 6. Somatório por coluna não pode depender só dos cards carregados

**Problema:** `useCrudInfiniteQuery` carrega deals em páginas de 30. Se o header somar `dealValue` a partir de `deals`, a métrica será parcial quando houver mais dados.

**Localização:** `src/hooks/ui/use-crud-infinite-query.ts`, `src/features/deals/services/deal.service.ts` e `src/app/api/v1/deals/route.ts`

**Impacto:**

- ⚠️ Header pode mostrar valor incorreto por stage.
- ⚠️ Usuário pode tomar decisão operacional com número parcial.
- ⚠️ O problema aumenta em contas com funis grandes.

**Solução Necessária:**

1. Adicionar agregados por `stageId` no retorno de `listDeals` respeitando os filtros.
2. Expor `count` e `dealValueSum` por stage.
3. Passar agregados para `CrudKanbanView` ou para `renderColumnHeader`.
4. Se a decisão for não criar agregado, nomear a métrica como "carregados".

---

## 🟢 Problemas Menores

### 7. Adicionar fase inline ainda não está definido

**Problema:** existe botão "Configurar funil" na tela e import de `EditStagesModal`, mas a experiência inline entre colunas ainda não está amarrada a um fluxo claro.

**Localização:** `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**Impacto:**

- 🟢 Usuário precisa sair do contexto do board para ajustar fases.
- 🟢 O recurso depende de decisões do PRD-006.

**Solução Necessária:**

1. Reusar o fluxo de configuração existente.
2. Não duplicar lógica de criação de stage no Kanban.
3. Adicionar o conector inline apenas se houver caminho claro de persistência e reorder.

---

### 8. Cobertura de testes não protege o novo comportamento

**Problema:** existem testes de layout para CRUD e `HeaderPageShell`, mas não há teste específico para o Kanban com altura fixa, classes de body customizadas ou colunas droppable.

**Localização:** `src/features/dashboard/components/crud/__tests__` e `src/features/dashboard/components/layout/__tests__`

**Impacto:**

- 🟢 Regressões de layout podem passar no lint.
- 🟢 Mudanças em componentes compartilhados podem afetar outras telas.

**Solução Necessária:**

1. Adicionar teste para novas props do `HeaderPageShell`.
2. Adicionar teste de renderização do `CrudKanbanView`.
3. Validar manualmente light/dark, muitas colunas e coluna vazia.

---

## ✅ O Que Está Bem

| Item | Status | Evidência |
|------|--------|-----------|
| Base de DnD | ✅ | Dependências `@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities` já instaladas. |
| Separação genérica | ✅ | `CrudKanbanView` recebe `renderCard`, `getItemId`, `getColumnId` e `onMoveItem`. |
| API de movimentação | ✅ | `PATCH /api/v1/deals/[dealId]` usa `updateDealAndTrackCapi`. |
| ScrollArea disponível | ✅ | `src/components/ui/scroll-area.tsx` já existe. |
| Referências visuais | ✅ | Imagens Pipefy existem em `public/pipefy/`. |
| Test stack | ✅ | Vitest, Testing Library e Playwright estão configurados no projeto. |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforço |
|----------|------------|---------------|-------|---------|
| Scroll do board compete com a página | Alto | Alta | CRITICO | 2h |
| Colunas sem droppable explícito | Alto | Media | CRITICO | 2h |
| API estreita do Kanban | Medio | Media | MEDIO | 1-2h |
| Contrato incompleto do card | Medio | Alta | MEDIO | 1-2h |
| Card pouco escaneável | Medio | Media | MEDIO | 2-3h |
| Somatório parcial por paginação | Medio | Alta | MEDIO | 2h |
| Add stage inline indefinido | Baixo | Media | BAIXO | 1-2h |
| Testes ausentes para novo comportamento | Baixo | Media | BAIXO | 1-2h |

---

## 🎯 Ordem de Fixação

### Fase 1: Críticos (4h)

1. T1: isolar viewport do Kanban dentro de `HeaderPageShell`.
2. T2: registrar colunas como droppable zones e validar DnD em colunas vazias.

### Fase 2: Contrato e UI (7h - 8h)

3. T3: ampliar API do `CrudKanbanView` sem acoplar deals.
4. T4: expor dados corretos para origem e tempo na fase.
5. T5: redesenhar `DealKanbanCard`.
6. T6: criar agregados por stage para métricas reais.

### Fase 3: Refinamento (2h - 3h)

7. T7: integrar ações de stage e add inline com o fluxo existente.
8. T8: adicionar testes e checklist visual.

**Total Estimado:** 13h - 15h

---

## 📝 Próximos Passos

1. Executar T1 e T2 antes de qualquer refinamento visual.
2. Confirmar se somatório do header deve ser total server-side ou apenas total carregado.
3. Confirmar se adicionar descrição de fase fica fora deste PRD, recomendado.
4. Implementar T3 a T8 na ordem descrita em `TASKS.md`.

---

**Status:** diagnóstico revisado e pronto para implementação.
