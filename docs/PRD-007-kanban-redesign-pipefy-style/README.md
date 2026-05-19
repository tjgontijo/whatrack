# PRD-007: Redesign do Kanban de Negociações, Estilo Pipefy

**Status:** Revisado para implementação
**Data:** 2026-05-19
**Versão:** 1.1

---

## 📋 O Que é Este PRD?

Este PRD define a revisão visual e estrutural do Kanban de Negociações em `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx`. O objetivo é aproximar a experiência do Pipefy sem quebrar a arquitetura atual de CRUD compartilhado.

**Documento:** redesign de UX do Kanban, ajustes de contrato de dados e plano de implementação.

**Tempo Total:** 13h - 15h estimadas.

---

## 📂 Estrutura do PRD

```txt
PRD-007-kanban-redesign-pipefy-style/
├── README.md (este arquivo)
├── CONTEXT.md (contexto do domínio)
├── DIAGNOSTIC.md (problemas e riscos)
├── TASKS.md (plano de implementação)
└── QUICK_START.md (guia rápido)
```

---

## 🎯 Resumo Executivo

### Status Atual

- A tela de deals usa `HeaderPageShell`, `CrudDataView` e `CrudKanbanView`.
- `CrudKanbanView` já usa `@dnd-kit/core`, `@dnd-kit/sortable` e `PointerSensor`.
- Cada coluna tem `overflow-y-auto`, mas a página também tem scroll vertical em `HeaderPageShell`, o que impede uma experiência Pipefy de viewport fixa.
- A coluna não registra `useDroppable` com o id da stage, embora `handleDragEnd` espere que o alvo possa ser uma coluna.
- O card de deals mostra nome, telefone, idade em dias, valor e responsável, mas ainda não usa origem, tempo na fase ou último contato de forma clara.
- `Deal` possui `stageEnteredAt` no Prisma, mas a listagem de deals não seleciona nem expõe esse campo.
- `tracking` é mapeado no serviço de deals, mas o tipo local `DealItem` da página ainda não declara esse contrato.

### Severidade

| Críticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 2 | 🟡 4 | 🟢 2 |

### Ordem de Implementação

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Estrutura crítica | T1-T2 | 4h |
| 2: Contrato e UI | T3-T6 | 7h - 8h |
| 3: Refinamento e validação | T7-T8 | 2h - 3h |

**Total:** 13h - 15h

---

## 🔴 Problemas Críticos

### T1: Viewport do Kanban não está isolado do scroll da página

**Impacto:** em pipelines longos, o usuário perde referência visual das fases e o comportamento de scroll fica diferente do Pipefy.

**Solução:** permitir que `HeaderPageShell` receba classes para body/content e usar um modo de Kanban com altura fixa, `overflow-hidden` no corpo e scroll horizontal apenas no board.

### T2: Drop em colunas vazias ou áreas livres é frágil

**Impacto:** mover deals para uma fase vazia pode falhar, porque a coluna não é registrada como droppable no `dnd-kit`.

**Solução:** registrar cada coluna com `useDroppable({ id: column.id })` e manter `SortableContext` apenas para a lista interna de cards.

---

## 🟡 Problemas Moderados

### T3: API do `CrudKanbanView` é estreita para header estilo Pipefy

**Impacto:** métricas, menu de stage, botão de adicionar e estados vazios tendem a ficar acoplados a deals ou hardcoded dentro do componente genérico.

**Solução:** estender props de renderização, mantendo o componente genérico e sem importar regras de deals nele.

### T4: Contrato de dados do card está incompleto

**Impacto:** origem, tempo na fase e último contato não podem ser exibidos com precisão.

**Solução:** expor `stageEnteredAt`, declarar `tracking` no `DealItem` e mapear origem por `tracking.utmSource`, `tracking.sourceType` ou fallback.

### T5: Card de deal ainda não comunica prioridade operacional

**Impacto:** o usuário precisa abrir ou ler vários campos para identificar valor, origem, responsável e tempo parado.

**Solução:** redesenhar `DealKanbanCard` com hierarquia compacta, metadados e estados de atividade.

### T6: Somatório por coluna pode ficar errado com paginação infinita

**Impacto:** somar apenas os cards carregados gera número incompleto quando existem mais de 30 deals.

**Solução:** criar agregados por stage no serviço de deals ou deixar explícito que o total é apenas dos cards carregados. A recomendação deste PRD é agregado server-side.

---

## 🟢 Problemas Menores

### T7: Ação inline de adicionar fase não está conectada ao fluxo atual

**Impacto:** o usuário sai do board para configurar o funil.

**Solução:** usar `onAddItem` ou uma nova prop de ação de stage para abrir o fluxo existente de configuração, respeitando o trabalho do PRD-006.

### T8: Faltam testes focados no novo layout

**Impacto:** regressões em scroll, padding, droppable e header podem passar sem aviso.

**Solução:** adicionar testes de componente para `HeaderPageShell` e `CrudKanbanView`, mais checklist visual manual.

---

## 💾 Arquivos Principais

- `src/features/dashboard/components/layout/header-page-shell.tsx` - controla o scroll da área de conteúdo.
- `src/features/dashboard/components/crud/crud-data-view.tsx` - compõe a view ativa e precisa preservar altura total.
- `src/features/dashboard/components/crud/crud-kanban-view.tsx` - orquestra DnD, colunas e cards.
- `src/features/dashboard/components/crud/types.ts` - define `KanbanColumn` e deve receber campos opcionais usados pelo header.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx` - implementa `DealKanbanCard` e integração de dados.
- `src/features/deals/services/deal.service.ts` - seleciona e mapeia campos consumidos pelo card.
- `src/features/deal-stages/services/deal-stage.service.ts` - lista fases e metadados de cada stage.
- `src/components/ui/scroll-area.tsx` - componente Radix disponível para scroll interno.
- `public/pipefy/pipefy.png` - referência visual principal.
- `public/pipefy/pipefy_menu_stage.png` - referência de menu de stage.
- `public/pipefy/pipefy_stage_add_colum.png` - referência de adicionar fase entre colunas.

---

## ✅ Como Começar

1. Ler `CONTEXT.md` para separar comportamento atual, comportamento desejado e limites do PRD.
2. Ler `DIAGNOSTIC.md` para entender os riscos reais encontrados no código.
3. Criar branch: `git checkout -b feature/kanban-pipefy-style`.
4. Executar `TASKS.md` na ordem T1 até T8.
5. Validar com `npm run lint`, testes focados e inspeção visual do board.

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforço |
|------|------------|---------------|-------|---------|
| T1 | Alto | Alta | CRITICO | 2h |
| T2 | Alto | Media | CRITICO | 2h |
| T3 | Medio | Media | MEDIO | 1-2h |
| T4 | Medio | Alta | MEDIO | 1-2h |
| T5 | Medio | Media | MEDIO | 2-3h |
| T6 | Medio | Alta | MEDIO | 2h |
| T7 | Baixo | Media | BAIXO | 1-2h |
| T8 | Baixo | Media | BAIXO | 1-2h |

---

**Status:** pacote revisado, pronto para execução técnica.
