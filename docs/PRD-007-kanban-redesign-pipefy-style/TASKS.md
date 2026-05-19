# Tasks: PRD-007 Kanban Pipefy-Style

**Data:** 2026-05-19 | **Status:** Revisado | **Total Tasks:** 8 | **Estimado:** 13h - 15h

---

## 🔴 Fase 1: Estrutura Crítica (4h)

### T1: Isolar a viewport do Kanban (2h)

**Problema:** `HeaderPageShell` cria scroll vertical no body da página e aplica padding fixo. O Kanban precisa usar a altura disponível sem competir com o scroll da página.

**Localização:**

- `src/features/dashboard/components/layout/header-page-shell.tsx`
- `src/features/dashboard/components/layout/__tests__/header-page-shell.test.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`
- `src/features/dashboard/components/crud/crud-data-view.tsx`

**O que fazer:**

1. Adicionar props opcionais em `HeaderPageShell`, por exemplo:

```tsx
bodyClassName?: string
contentClassName?: string
```

2. Aplicar essas classes nos wrappers hoje fixos:

```tsx
<div className={cn('scrollbar-hide flex-1 overflow-y-auto', bodyClassName)}>
  <div className={cn('min-h-full px-6 py-6', contentClassName)}>
```

3. Em `DealsPage`, quando `view === 'kanban'`, passar classes que removem padding vertical e travam overflow externo.
4. Garantir que `CrudDataView` continue com `h-full` e que o Kanban receba um pai com `min-h-0`.

**Aceitação:**

- [ ] A view list e cards mantém espaçamento atual.
- [ ] A view Kanban ocupa a área abaixo do header sem scroll vertical da página.
- [ ] O scroll horizontal acontece no board.
- [ ] O scroll vertical acontece dentro das colunas.
- [ ] Teste de `HeaderPageShell` cobre as novas props sem quebrar os testes existentes.

**Como testar:**

```bash
npm run test -- src/features/dashboard/components/layout/__tests__/header-page-shell.test.tsx
npm run lint
```

**Tempo:** 2h

---

### T2: Tornar colunas droppable e compatíveis com scroll interno (2h)

**Problema:** o código tenta identificar drop sobre coluna, mas a coluna não é registrada com `useDroppable`.

**Localização:** `src/features/dashboard/components/crud/crud-kanban-view.tsx`

**O que fazer:**

1. Importar `useDroppable` de `@dnd-kit/core`.
2. Registrar cada coluna por `column.id`.
3. Aplicar `setNodeRef` no corpo que representa a zona de drop.
4. Manter `SortableContext` para os cards.
5. Preservar `PointerSensor` com `activationConstraint`.
6. Usar `ScrollArea` em vez de `overflow-y-auto` direto, se o comportamento com DnD permanecer estável.

**Snippet orientativo:**

```tsx
const { setNodeRef, isOver } = useDroppable({ id: column.id })

return (
  <div ref={setNodeRef} className='min-h-0 flex-1'>
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {/* cards */}
    </SortableContext>
  </div>
)
```

**Aceitação:**

- [ ] É possível mover um deal para uma coluna vazia.
- [ ] É possível mover um deal para a área abaixo do último card.
- [ ] O highlight de coluna funciona quando o card está sobre a coluna.
- [ ] O drag overlay continua aparecendo.
- [ ] Nenhuma regra de deals é adicionada ao componente genérico.

**Como testar:**

```bash
npm run test -- src/features/dashboard/components/crud
npm run lint
```

Teste manual:

```txt
1. Abrir Kanban de deals.
2. Criar ou simular uma stage vazia.
3. Arrastar um card para a stage vazia.
4. Confirmar PATCH /api/v1/deals/[dealId] com novo stageId.
5. Recarregar a página e confirmar que o card permanece na nova stage.
```

**Tempo:** 2h

---

## 🟡 Fase 2: Contrato e UI (7h - 8h)

### T3: Ampliar API do `CrudKanbanView` sem acoplar deals (1.5h)

**Problema:** o header de coluna é hardcoded e não suporta métricas, ações e menu por stage sem alterar o componente genérico.

**Localização:**

- `src/features/dashboard/components/crud/crud-kanban-view.tsx`
- `src/features/dashboard/components/crud/types.ts`

**O que fazer:**

1. Adicionar props opcionais:

```tsx
renderColumnHeader?: (column: KanbanColumn, items: T[]) => React.ReactNode
renderColumnActions?: (column: KanbanColumn) => React.ReactNode
renderEmptyColumn?: (column: KanbanColumn) => React.ReactNode
```

2. Manter fallback igual ao header atual para não quebrar outros usos.
3. Estender `KanbanColumn` com campos opcionais. `dealsCount`, `isDefault` e `isClosed` já vêm de `/api/v1/deal-stages`; `statusGroup` e `probability` só devem ser usados se também forem expostos pelo service.

```ts
dealsCount?: number
isDefault?: boolean
isClosed?: boolean
statusGroup?: string
probability?: number
```

4. Não adicionar `description` sem migration, porque `DealStage.description` não existe.

**Aceitação:**

- [ ] `CrudKanbanView` continua renderizando sem novas props.
- [ ] `DealsPage` consegue customizar header da stage.
- [ ] Tipos aceitam campos extras retornados por `/api/v1/deal-stages`.
- [ ] Não há import de services ou código de deals dentro do componente CRUD.

**Como testar:**

```bash
npm run test -- src/features/dashboard/components/crud
npm run lint
```

**Tempo:** 1.5h

---

### T4: Expor origem, tempo na fase e tracking para o card (1.5h)

**Problema:** o card Pipefy precisa de informações que ainda não estão completas no contrato da página.

**Localização:**

- `src/features/deals/services/deal.service.ts`
- `src/features/deals/services/__tests__/deal.service.test.ts`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**O que fazer:**

1. Adicionar `stageEnteredAt` ao `dealListSelect`.
2. Mapear `stageEnteredAt` para ISO string em `mapDealListItem`.
3. Declarar `tracking` no tipo `DealItem`.
4. Declarar `windowExpiresAt` no tipo `DealItem`, porque o serviço já retorna esse campo.
5. Criar helper local para origem do card:

```ts
const getDealOrigin = (deal: DealItem) =>
  deal.tracking?.utmSource || deal.tracking?.sourceType || 'Origem não informada'
```

6. Usar `stageEnteredAt ?? createdAt` apenas como fallback visual.

**Aceitação:**

- [ ] Resposta de `GET /api/v1/deals` inclui `stageEnteredAt`.
- [ ] TypeScript não exige `any` para `tracking`.
- [ ] Card consegue exibir origem sem acessar campo inexistente.
- [ ] Teste de service cobre o novo campo mapeado.

**Como testar:**

```bash
npm run test -- src/features/deals/services/__tests__/deal.service.test.ts
npm run lint
```

**Tempo:** 1.5h

---

### T5: Redesenhar `DealKanbanCard` com hierarquia operacional (2h - 3h)

**Problema:** o card atual é legível, mas não prioriza valor, origem, atividade e responsável.

**Localização:** `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**O que fazer:**

1. Se o componente crescer demais, extrair para `src/features/deals/components/deal-kanban-card.tsx`.
2. Usar estrutura compacta:

```txt
Nome do lead
Telefone ou identificador
Origem + valor
Tempo na fase + último contato + responsável
```

3. Usar acento com `deal.stage.color`.
4. Usar ícones `lucide-react` já disponíveis.
5. Manter raio visual consistente com o Pipefy, preferencialmente `rounded-lg`.
6. Evitar card dentro de card.
7. Garantir truncamento de nome, telefone e origem.

**Aceitação:**

- [ ] Card não passa de 280px de largura útil dentro da coluna.
- [ ] Nome, origem, valor, tempo na fase e responsável ficam visíveis ou têm fallback.
- [ ] Textos longos truncam sem quebrar layout.
- [ ] Light mode usa card claro sobre coluna cinza.
- [ ] Dark mode mantém contraste sem inverter hierarquia.
- [ ] O drag handle continua acessível no hover.

**Como testar:**

```bash
npm run lint
npm run dev
```

Checklist manual:

```txt
1. Testar lead com nome longo.
2. Testar lead sem telefone.
3. Testar deal sem valor.
4. Testar deal sem responsável.
5. Testar origem ausente.
6. Alternar light/dark.
```

**Tempo:** 2h - 3h

---

### T6: Criar métricas reais por stage para o header (2h)

**Problema:** somar `dealValue` no client só considera páginas já carregadas.

**Localização:**

- `src/features/deals/services/deal.service.ts`
- `src/app/api/v1/deals/route.ts`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

**O que fazer:**

1. Em `listDeals`, adicionar aggregate agrupado por `stageId` usando os mesmos filtros da listagem.
2. Retornar estrutura como:

```ts
stageStats: Record<string, { count: number; dealValueSum: number }>
```

3. Atualizar tipo de página retornado por `useCrudInfiniteQuery` se necessário. Se o hook não expõe metadados além de `items`, criar query separada para stats.
4. Exibir `count` e valor formatado no header da coluna.
5. Manter `items.length` apenas como fallback visual, não como métrica oficial.

**Aceitação:**

- [ ] Header mostra quantidade e soma total por stage considerando filtros atuais.
- [ ] Métrica não muda incorretamente ao carregar próxima página.
- [ ] Filtros de status, busca e data afetam os agregados.
- [ ] Stage sem deals mostra zero.

**Como testar:**

```bash
npm run test -- src/features/deals/services/__tests__/deal.service.test.ts
npm run lint
```

Teste manual:

```txt
1. Criar mais deals do que o pageSize.
2. Abrir Kanban sem rolar paginação.
3. Comparar soma do header com dados esperados no banco.
4. Aplicar filtro de status e confirmar atualização do header.
```

**Tempo:** 2h

---

## 🟢 Fase 3: Refinamento e Validação (2h - 3h)

### T7: Integrar menu de stage e add inline ao fluxo existente (1h - 1.5h)

**Problema:** a referência Pipefy tem menu por stage e conector para adicionar fase, mas o projeto já tem fluxo de configuração de funil. A implementação precisa evitar dois caminhos concorrentes.

**Localização:**

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`
- `src/features/deal-stage-templates/dialogs/edit-stages-modal.tsx`
- `src/features/deal-stages/dialogs/stage-dialog.tsx`
- `src/features/dashboard/components/crud/crud-kanban-view.tsx`

**O que fazer:**

1. Adicionar menu visual no header da stage usando componentes UI existentes, se `DropdownMenu` estiver disponível no projeto.
2. Caso `DropdownMenu` não exista, criar ou usar o padrão de menu já existente no app.
3. Para "Criar fase", abrir fluxo existente de stage em vez de duplicar POST manual no card.
4. Para conector inline entre colunas, renderizar trigger discreto apenas quando houver handler.
5. Marcar qualquer dependência do PRD-006 como bloqueador parcial, não como requisito de T1 a T6.

**Aceitação:**

- [ ] Menu aparece no header sem deslocar texto da stage.
- [ ] Ação de configurar funil continua disponível.
- [ ] Add inline não aparece se não houver handler.
- [ ] Nenhuma lógica de persistência de stage é duplicada dentro de `CrudKanbanView`.

**Como testar:**

```bash
npm run lint
npm run dev
```

**Tempo:** 1h - 1.5h

---

### T8: Adicionar testes e QA visual (1h - 1.5h)

**Problema:** mudanças em layout compartilhado e DnD precisam de guarda mínima.

**Localização:**

- `src/features/dashboard/components/layout/__tests__/header-page-shell.test.tsx`
- `src/features/dashboard/components/crud/__tests__/crud-kanban-view.test.tsx` (novo)
- `src/features/dashboard/components/crud/__tests__/crud-views-spacing.test.tsx`

**O que fazer:**

1. Cobrir novas props de classe do `HeaderPageShell`.
2. Cobrir render básico do `CrudKanbanView` com colunas vazias.
3. Cobrir fallback de header quando `renderColumnHeader` não é passado.
4. Fazer QA manual em desktop e largura reduzida.
5. Rodar lint e testes focados.

**Aceitação:**

- [ ] Teste prova que `HeaderPageShell` aceita classes customizadas.
- [ ] Teste prova que Kanban renderiza coluna vazia.
- [ ] Teste prova que render customizado de header é usado.
- [ ] QA visual registra que não há sobreposição de textos ou controles.

**Como testar:**

```bash
npm run test -- src/features/dashboard/components/layout/__tests__/header-page-shell.test.tsx src/features/dashboard/components/crud
npm run lint
```

Checklist manual:

```txt
1. Kanban com 1 coluna e muitos cards.
2. Kanban com muitas colunas.
3. Coluna vazia.
4. Nome de stage longo.
5. Card com nome de lead longo.
6. Tema light.
7. Tema dark.
```

**Tempo:** 1h - 1.5h

---

## 📊 Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 | 2h | Nenhum |
| T2 | 2h | T1 recomendado |
| T3 | 1.5h | T1 |
| T4 | 1.5h | Nenhum |
| T5 | 2h - 3h | T3 e T4 |
| T6 | 2h | Decisão sobre métrica oficial |
| T7 | 1h - 1.5h | PRD-006 para fluxo completo de stage |
| T8 | 1h - 1.5h | T1 a T7 |

**Total:** 13h - 15h

---

**Status:** plano pronto para execução.
