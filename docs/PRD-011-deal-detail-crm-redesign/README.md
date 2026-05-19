# PRD-011: Deal Detail CRM Redesign

**Status:** Proposto
**Data:** 2026-05-19
**Versao:** 1.0

## O Que e Este PRD?

Este PRD define a reformulacao da experiencia de detalhes de uma negociacao no Whatrack. O objetivo e sair de um dialog estreito e centrado em atendimento WhatsApp para uma experiencia de CRM real, focada em receita, itens negociados, campos comerciais, etapas, previsao, responsavel, proximas acoes, historico e fechamento.

**Documento:** especificacao de produto, diagnostico tecnico e plano de implementacao.

**Tempo Total:** 7 a 10 dias uteis.

## Estrutura do PRD

```txt
PRD-011-deal-detail-crm-redesign/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
└── QUICK_START.md
```

## Resumo Executivo

### Status Atual

- Existe Kanban de deals em `src/features/deals/screens/deals-screen.tsx`.
- O detalhe atual esta em `src/features/deals/components/dialogs/deal-details-dialog.tsx`.
- O modelo `Deal` em `prisma/schema.prisma` tem valor, etapa, status e metricas de mensagem, mas nao tem dados comerciais essenciais como nome da negociacao, itens negociados, data prevista de fechamento, probabilidade, prioridade e proxima acao.
- `Deal.conversationId` e obrigatorio hoje. Para criacao manual de negociacoes, T2 deve torna-lo opcional e manter `leadId` obrigatorio no MVP.
- `Item`, `Sale` e `SaleItem` existem, mas ainda nao ha `DealLineItem` para representar produtos ou servicos durante a negociacao.
- `SaleItem.quantity` e `Int` hoje. O PRD exige decidir se quantidades fracionadas entram agora, porque `DealLineItem` e `SaleItem` precisam ter tipos compativeis.
- A UI atual mistura negociacao com detalhes de atendimento WhatsApp, deixando informacoes comerciais importantes ausentes.

### Decisao de Produto

A experiencia completa deve ser uma pagina dedicada:

```txt
/{organizationSlug}/{projectSlug}/deals/[dealId]?tab=overview
```

O dialog atual deve ser substituido por uma navegacao para a pagina de detalhe, ou reduzido futuramente a um preview rapido. A pagina deve usar tabs com estado na URL para permitir compartilhamento, refresh e retorno ao mesmo contexto.

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 4 | 4 | 2 |

### Ordem de Implementacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Criticos | T1-T4 | 4 a 5 dias |
| 2: Robustez | T5-T8 | 2.5 a 4 dias |
| 3: Melhorias | T9-T10 | 0.5 a 1 dia |

**Total:** 7 a 10 dias uteis.

## Problemas Criticos

### T1: Definir experiencia principal como pagina de detalhe

**Impacto:** o dialog atual nao comporta uma negociacao real, gera overflow e mistura contextos.
**Solucao:** criar rota dedicada de detalhe com tabs e URL state.

### T2: Modelar dados comerciais essenciais da negociacao

**Impacto:** nao ha como registrar nome da deal, itens negociados, previsao de fechamento, probabilidade, prioridade ou proxima acao.
**Solucao:** estender `Deal`, tornar `conversationId` opcional, adicionar `currency` com default seguro e adicionar `DealLineItem` com quantidade compativel com `SaleItem`.

### T3: Criar contratos de leitura e escrita para detalhe da deal

**Impacto:** o detalhe atual depende de um select parcial e mistura dados de atendimento com dados comerciais.
**Solucao:** criar services, repositories, schemas e DTOs especificos para a pagina de detalhe.

### T4: Implementar layout CRM com tabs

**Impacto:** usuario nao encontra informacoes centrais da negociacao.
**Solucao:** construir tela com resumo, propriedades, itens negociados, atividades, historico e atribuicao.

## Problemas Moderados

### T5: Campos customizados e regras por fase

**Impacto:** negocios diferentes precisam de campos diferentes, e alguns campos so devem ser obrigatorios em certas etapas.
**Solucao:** criar definicoes de campos, valores por deal e regras por etapa, deixando explicito o comportamento com `DealStageTemplate` e `DealStageTemplateItem`.

### T6: Fluxo correto de fechamento ganho/perdido

**Impacto:** fechar deal sem validar valor, itens e motivo de perda enfraquece relatorios e vendas.
**Solucao:** validar campos obrigatorios por status e converter itens negociados em `SaleItem` quando ganhar.

### T7: Historico comercial da deal

**Impacto:** mudancas importantes em valor, etapa, itens e previsao nao ficam auditaveis de forma clara.
**Solucao:** adicionar historico de mudancas comerciais.

### T8: Separar WhatsApp de CRM

**Impacto:** a conversa ocupa o espaco principal onde deveria estar a negociacao.
**Solucao:** mover conversa e metricas de atendimento para tab secundaria de atividades.

## Problemas Menores

### T9: Atualizar cards/lista com resumo comercial

**Impacto:** Kanban mostra pouco contexto sobre valor, item e proxima acao.
**Solucao:** exibir dados comerciais compactos no card e na tabela.

### T10: Testes, seed e documentacao de validacao

**Impacto:** mudanca grande sem testes aumenta risco de regressao.
**Solucao:** cobrir services, schemas e principais estados de UI.

## Arquivos Principais

- `prisma/schema.prisma` - modelos `Deal`, `DealStage`, `Sale`, `SaleItem`, `Item`.
- `src/features/deals/services/deal.service.ts` - logica atual de listagem, detalhe, criacao, atualizacao e fechamento.
- `src/app/api/v1/deals/[dealId]/route.ts` - endpoint atual de detalhe e update.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/deals/page.tsx` - rota atual de listagem.
- `src/features/deals/screens/deals-screen.tsx` - tela atual do Kanban/lista.
- `src/features/deals/components/dialogs/deal-details-dialog.tsx` - dialog atual a ser substituido ou reduzido.
- `src/features/deals/types.ts` - tipos publicos atuais da feature.
- `src/features/items/*` - catalogo de itens existente.
- `src/features/sales/*` - venda e itens de venda apos fechamento.

## Como Comecar

1. Ler `CONTEXT.md`, `DIAGNOSTIC.md`, `TASKS.md` e `QUICK_START.md`.
2. Criar branch: `git checkout -b feature/deal-detail-crm-redesign`.
3. Implementar T1 a T4 antes de ajustes visuais finos.
4. Criar commits por task ou por fase.
5. Rodar lint, testes unitarios e fluxo manual no Kanban e na nova pagina.

## Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 | Alto | Alta | CRITICO | 0.5d |
| T2 | Alto | Alta | CRITICO | 1d |
| T3 | Alto | Alta | CRITICO | 1d |
| T4 | Alto | Alta | CRITICO | 1.5 a 2d |
| T5 | Medio | Media | MEDIO | 1 a 1.5d |
| T6 | Medio | Media | MEDIO | 0.5 a 1d |
| T7 | Medio | Media | MEDIO | 0.5 a 1d |
| T8 | Medio | Alta | MEDIO | 0.5d |
| T9 | Baixo | Media | BAIXO | 0.5d |
| T10 | Medio | Alta | MEDIO | 1d |

**Status:** pronto para revisao e implementacao.
