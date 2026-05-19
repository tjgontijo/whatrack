# Context: Kanban de Negociações, Estilo Pipefy

**Última atualização:** 2026-05-19

---

## 📌 Definição

O Kanban de Negociações é a visualização principal do funil comercial dentro da tela `Negociações`. Ele organiza deals por fase e permite mover cards entre stages.

**O que é:**

- Uma visualização operacional de `Deal`.
- Uma superfície de drag and drop para alterar `stageId`.
- Um board de acompanhamento por fase, quantidade, valor e atividade.
- Uma experiência de trabalho recorrente para usuários de vendas e atendimento.

**O que NÃO é:**

- Um dashboard analítico completo.
- Um substituto da tela de configuração de funil.
- Uma implementação completa de regras condicionais por fase.
- Uma mudança de modelo de autorização.

---

## 🔄 Fluxo Completo

```txt
Usuário acessa /[organizationSlug]/[projectSlug]/deals
  ↓
DealsPage carrega deals via useCrudInfiniteQuery
  ↓
DealsPage carrega stages via GET /api/v1/deal-stages
  ↓
CrudDataView renderiza a view ativa
  ↓
CrudKanbanView agrupa deals por stage.id
  ↓
Usuário move card entre colunas
  ↓
PATCH /api/v1/deals/[dealId] atualiza stageId
  ↓
TanStack Query invalida deals e a tela reflete o novo stage
```

---

## 💾 Dados Existentes

### `Deal`, Prisma

Campos relevantes encontrados em `prisma/schema.prisma`:

```ts
{
  id: string
  organizationId: string
  projectId?: string | null
  conversationId: string
  stageId: string
  stageEnteredAt?: Date | null
  assigneeId?: string | null
  dealValue?: Decimal | null
  statusId: string
  messagesCount: number
  createdAt: Date
  updatedAt: Date
  source: string
  originatedFrom?: string | null
}
```

### Dados já expostos no card

`src/features/deals/services/deal.service.ts` já retorna para a listagem:

- `lead.id`, `lead.name`, `lead.phone`, `lead.pushName`.
- `stage.id`, `stage.name`, `stage.color`, `stage.metaRules`.
- `assignee.id`, `assignee.name`.
- `tracking.utmSource`, `tracking.sourceType`, `tracking.ctwaclid`.
- `status`.
- `windowOpen`, `windowExpiresAt`.
- `dealValue`.
- `messagesCount`, `salesCount`.
- `createdAt`.
- `lastMessageAt`.

### Lacunas do contrato atual

- `stageEnteredAt` existe no banco, mas não é selecionado em `dealListSelect`.
- `tracking` é retornado pelo serviço, mas não está declarado no tipo `DealItem` da página.
- `DealStage.statusGroup` e `DealStage.probability` existem no Prisma, mas `listDealStages` não expõe esses campos.
- `DealStage.description` não existe no Prisma. Qualquer descrição de fase vista na referência Pipefy deve ficar fora deste PRD ou exigir migration separada.

---

## 🎯 Referências Pipefy Aplicáveis

Arquivos locais:

- `public/pipefy/pipefy.png`.
- `public/pipefy/pipefy_menu_stage.png`.
- `public/pipefy/pipefy_stage_add_colum.png`.

Padrões extraídos:

- Board horizontal com colunas de largura fixa.
- Header de stage sempre visível.
- Conteúdo da coluna com scroll vertical próprio.
- Cor da stage aplicada como faixa superior ou destaque discreto.
- Cards brancos sobre fundo cinza claro no tema light.
- Cards com nome forte, origem, tempo de atividade e metadados compactos.
- Menu de stage com ações, mas sem misturar regra de negócio dentro do componente genérico.
- Conector entre colunas para adicionar fase.

---

## 🧱 Arquitetura Atual

### `DealsPage`

Arquivo: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`

Responsabilidades atuais:

- Mantém estado local de view, busca e filtros.
- Busca deals com `useCrudInfiniteQuery`.
- Busca stages com `useQuery`.
- Renderiza list, cards e kanban.
- Define `DealKanbanCard`.
- Executa mutation de mudança de stage.

Ponto de atenção: como a página é client component, qualquer busca inicial continua sendo client-side neste PRD. Migrar para Server Component fica fora do escopo para não reabrir toda a tela de CRUD.

### `HeaderPageShell`

Arquivo: `src/features/dashboard/components/layout/header-page-shell.tsx`

Responsabilidade atual:

- Header fixo de 48px.
- Body com `flex-1 overflow-y-auto`.
- Content interno com `min-h-full px-6 py-6`.

Ponto de atenção: esse wrapper funciona bem para listas e grids, mas o Kanban precisa controlar a altura inteira do body para evitar scroll global.

### `CrudKanbanView`

Arquivo: `src/features/dashboard/components/crud/crud-kanban-view.tsx`

Responsabilidade atual:

- Client component.
- Usa `DndContext`, `SortableContext` e `DragOverlay`.
- Agrupa itens por coluna.
- Renderiza `KanbanColumnComponent`.
- Chama `onMoveItem` ao trocar de coluna.

Ponto de atenção: `handleDragEnd` tenta resolver drops sobre coluna, mas a coluna não registra `useDroppable`. A implementação precisa alinhar o código ao comportamento esperado.

---

## 🔗 Integrações Técnicas

### APIs reais

- `GET /api/v1/deals`: lista deals paginados.
- `POST /api/v1/deals`: cria deal.
- `GET /api/v1/deals/[dealId]`: detalhe do deal.
- `PATCH /api/v1/deals/[dealId]`: atualiza `stageId`, `assigneeId`, `dealValue` e `projectId`.
- `GET /api/v1/deal-stages`: lista fases.
- `POST /api/v1/deal-stages`: cria fase.
- `PUT /api/v1/deal-stages/[stageId]`: atualiza fase.
- `DELETE /api/v1/deal-stages/[stageId]`: remove fase.
- `PUT /api/v1/deal-stages/reorder`: reordena fases.

### Permissões

| Ação | Permissão atual | Evidência |
|------|-----------------|-----------|
| Ver deals | `view:deals` | `GET /api/v1/deals` |
| Mover deal | `manage:deals` | `PATCH /api/v1/deals/[dealId]` |
| Ver stages | acesso completo à organização | `GET /api/v1/deal-stages` |
| Criar stages | `manage:deals` | `POST /api/v1/deal-stages` |

---

## 📋 Regras de Negócio

- Mover card atualiza `stageId`.
- A mutation de deal usa `updateDealAndTrackCapi`, portanto deve preservar o fluxo de eventos CAPI já existente.
- Filtros de status e data devem continuar funcionando na view Kanban.
- Se o header mostrar valor total por stage, o número deve representar todos os deals filtrados, não apenas a página carregada, exceto se a UI declarar explicitamente "carregados".
- A inclusão de descrição de fase, regras obrigatórias por stage ou automações de movimentação fica fora deste PRD.

---

## 📝 Resumo para Implementação

- Ajustar `HeaderPageShell` para aceitar classes do body/content e permitir modo full-height para Kanban.
- Atualizar `CrudKanbanView` para usar `ScrollArea`, colunas droppable e render props para header/actions.
- Atualizar o contrato de deals para expor `stageEnteredAt` e tipar `tracking`.
- Redesenhar `DealKanbanCard` dentro da página de deals ou extrair para `features/deals/components` se o arquivo ficar grande.
- Calcular agregados por stage server-side se o header exibir valor total real.
- Integrar ações de stage com o fluxo existente de configurações sem duplicar regra de stage.
