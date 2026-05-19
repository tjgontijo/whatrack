# Diagnostic: Problemas no Detalhe de Negociacao

**Data:** 2026-05-19
**Status:** Proposto
**Escopo:** `prisma/schema.prisma`, `src/features/deals`, `src/features/items`, `src/features/sales`, rotas de deals e UI do Kanban.

## Resumo Executivo

O sistema de deals esta funcional para Kanban basico, mas nao sustenta uma experiencia de CRM completa.

- 4 Criticos: superficie de detalhe errada, modelo incompleto, falta de itens negociados, falta de contratos especificos de detalhe.
- 4 Moderados: campos por etapa ausentes, fechamento fraco, historico comercial insuficiente, WhatsApp dominando a tela.
- 2 Menores: cards/lista com pouco contexto e falta de cobertura de testes para a nova experiencia.

**Conclusao:** a correcao nao deve ser outro ajuste visual no dialog. A solucao correta e uma pagina dedicada de detalhe de negociacao com modelagem comercial adequada.

## Problemas Criticos

### 1. Dialog atual e inadequado para detalhe de CRM

**Problema:** `src/features/deals/components/dialogs/deal-details-dialog.tsx` tenta mostrar lead, etapa, valor, metricas e inteligencia em um modal. Mesmo apos ajuste de largura, o formato continua ruim para uma negociacao real.

**Localizacao:** `src/features/deals/components/dialogs/deal-details-dialog.tsx`

**Impacto:**

- Usuario nao tem URL compartilhavel da deal.
- Tabs, historico, itens e formularios ficam espremidos.
- Modal mistura contexto de conversa com contexto comercial.
- Nao escala para campos customizados e itens negociados.

**Solucao Necessaria:**

1. Criar rota dedicada `/deals/[dealId]`.
2. Usar tabs com `searchParams`.
3. Alterar click do card/lista para navegar para a pagina.
4. Manter dialog apenas como preview futuro, se necessario.

### 2. Modelo `Deal` nao possui campos comerciais basicos

**Problema:** `Deal` tem `dealValue`, etapa e status, mas nao tem nome da negociacao, data prevista de fechamento, probabilidade, prioridade, temperatura, proxima acao e descricao.

**Localizacao:** `prisma/schema.prisma` > `model Deal`

**Impacto:**

- Nao da para gerir pipeline como CRM.
- Forecast e incompleto.
- Vendedor nao sabe proxima acao pela tela.
- Tabela e Kanban nao conseguem mostrar dados relevantes.

**Solucao Necessaria:**

1. Adicionar campos comerciais principais em `Deal`.
2. Tornar `conversationId` opcional para permitir deals manuais sem WhatsApp.
3. Definir `currency` com default, por exemplo `BRL`, para migration segura.
4. Atualizar schemas de create/update.
5. Atualizar DTOs e mappers.
6. Criar validacoes de negocio no service.

### 3. Nao existe item negociado antes da venda

**Problema:** existem `Item`, `Sale` e `SaleItem`, mas nao existe `DealLineItem`. Hoje a negociacao guarda no maximo um `dealValue`, sem saber quais produtos ou servicos compoem o valor.

**Localizacao:** `prisma/schema.prisma` > `model Item`, `model SaleItem`, `model Deal`

**Impacto:**

- Valor negociado nao e auditavel.
- Vendedor nao registra produto, quantidade, desconto ou total.
- Fechamento ganho nao reaproveita itens da proposta.
- Relatorios por produto ficam incompletos antes da venda.

**Solucao Necessaria:**

1. Criar `DealLineItem`.
2. Relacionar com `Deal` e opcionalmente com `Item`.
3. Atualizar endpoint de detalhe para retornar itens.
4. Garantir que `DealLineItem.quantity` e `SaleItem.quantity` tenham tipos compativeis.
5. Ao ganhar deal, converter line items em `SaleItem`.

### 4. Contratos de detalhe estao acoplados ao service atual

**Problema:** `deal.service.ts` concentra listagem, detalhe, criacao, update, close e tracking. O `dealDetailsSelect` atual mistura dados de lead, mensagens, sales e tracking, mas nao expressa um DTO de pagina CRM.

**Localizacao:** `src/features/deals/services/deal.service.ts`

**Impacto:**

- Crescimento da feature aumenta risco de arquivo grande e acoplado.
- Client recebe dados que nao estao organizados por necessidade de UI.
- Regras de fechamento, itens e campos por etapa ficariam misturadas.

**Solucao Necessaria:**

1. Criar repositories especificos para detalhe, update comercial, line items e fechamento.
2. Criar services por caso de uso.
3. Criar mappers para DTOs de UI.
4. Manter API routes finas.

## Problemas Moderados

### 5. Campos customizados e regras por etapa inexistem

**Problema:** etapas existem, mas nao controlam quais campos aparecem ou sao obrigatorios.

**Impacto:**

- Processo comercial nao e padronizavel.
- Etapas avancadas podem ter dados essenciais ausentes.
- Organizacoes diferentes nao conseguem adaptar a deal ao seu processo.

**Solucao Necessaria:**

1. Criar `DealFieldDefinition`, `DealFieldValue` e `DealStageFieldRule`.
2. Implementar validacao de obrigatoriedade por etapa.
3. Exibir campos dinamicos na sidebar ou em tab de propriedades.
4. Decidir no MVP se regras sao configuradas manualmente apos criacao do funil ou se tambem entram em `DealStageTemplate` e `DealStageTemplateItem`.

### 6. Fechamento ganho/perdido nao valida negociacao completa

**Problema:** `closeDeal` aceita `dealValue`, mas nao valida itens negociados, campos obrigatorios de etapa ou motivo de perda de forma ampla.

**Localizacao:** `src/features/deals/services/deal.service.ts` > `closeDeal`

**Impacto:**

- Venda pode nascer incompleta.
- Deal perdida pode ficar sem motivo operacional util.
- Relatorios executivos ficam inconsistentes.

**Solucao Necessaria:**

1. Validar motivo de perda.
2. Validar valor e itens ao ganhar.
3. Sincronizar `Sale` e `SaleItem`.
4. Registrar historico de fechamento.

### 7. Historico comercial insuficiente

**Problema:** existe `stageEnteredAt`, mas nao ha historico estruturado de mudancas comerciais da deal.

**Impacto:**

- Nao se sabe quem alterou valor, etapa, previsao ou responsavel.
- Forecast pode mudar sem rastreabilidade.
- Auditoria e investigacao ficam fracas.

**Solucao Necessaria:**

1. Criar historico comercial ou reutilizar uma trilha de audit existente, se adequada.
2. Registrar mudancas em etapa, valor, probabilidade, data prevista, responsavel, itens e fechamento.
3. Exibir tab `history`.

### 8. WhatsApp ocupa area principal da negociacao

**Problema:** metricas e inteligencia de conversa aparecem como foco do dialog atual.

**Impacto:**

- A tela parece atendimento, nao CRM.
- Dados da negociacao ficam secundarios.
- Usuario nao entende rapidamente produto, valor, fechamento e proxima acao.

**Solucao Necessaria:**

1. Mover mensagens e metricas para tab `activities`.
2. Exibir somente resumo minimo de conversa no overview.
3. Priorizar dados comerciais no header e na sidebar.

## Problemas Menores

### 9. Kanban e lista nao mostram resumo comercial suficiente

**Problema:** card exibe lead, origem e valor, mas nao item principal, data prevista ou proxima acao.

**Impacto:**

- Vendedor precisa abrir detalhe para tomar decisoes simples.
- Priorizacao no Kanban fica limitada.

**Solucao Necessaria:**

1. Adicionar item principal ou contagem de itens.
2. Adicionar data prevista ou alerta de proxima acao.
3. Manter card compacto.

### 10. Testes nao cobrem novo contrato de CRM

**Problema:** existem testes de service, mas nao para os novos fluxos de line items, validacao por etapa e DTO de detalhe.

**Impacto:**

- Alto risco de regressao em pipeline, fechamento e sincronizacao de venda.

**Solucao Necessaria:**

1. Adicionar testes unitarios de services.
2. Adicionar testes de schemas.
3. Adicionar testes de renderizacao dos principais estados, se houver infraestrutura.

## O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| Kanban existe | OK | `src/features/deals/components/kanban/*` |
| Etapas configuraveis existem | OK | `DealStage`, `DealStageTemplate`, `EditStagesModal` |
| Catalogo de itens existe | OK | `model Item`, `src/features/items/*` |
| Venda e itens de venda existem | OK | `model Sale`, `model SaleItem` |
| Tracking de origem existe | OK | `model DealTracking` |
| API de detalhe existe | OK | `src/app/api/v1/deals/[dealId]/route.ts` |

## Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Dialog inadequado | Alto | Alta | CRITICO | 0.5d |
| Deal sem campos comerciais | Alto | Alta | CRITICO | 1d |
| `conversationId` obrigatorio bloqueia deal manual | Alto | Alta | CRITICO | Incluso em T2 |
| `currency` sem default pode quebrar migration | Alto | Media | CRITICO | Incluso em T2 |
| Ausencia de DealLineItem | Alto | Alta | CRITICO | 1d |
| `quantity` incompativel entre DealLineItem e SaleItem | Alto | Media | CRITICO | Incluso em T2/T6 |
| Service acoplado | Alto | Media | CRITICO | 1d |
| Campos por etapa ausentes | Medio | Media | MEDIO | 1 a 1.5d |
| Regras por etapa sem alinhamento com templates | Medio | Media | MEDIO | Incluso em T5 |
| Fechamento incompleto | Medio | Media | MEDIO | 0.5 a 1d |
| Historico insuficiente | Medio | Media | MEDIO | 0.5 a 1d |
| WhatsApp como foco | Medio | Alta | MEDIO | 0.5d |
| Card com pouco contexto | Baixo | Media | BAIXO | 0.5d |
| Testes incompletos | Medio | Alta | MEDIO | 1d |

## Ordem de Fixacao

### Fase 1: Criticos, 4 a 5 dias

1. T1: Criar rota e decisao de navegacao.
2. T2: Modelar campos comerciais e line items.
3. T3: Criar contratos server para detalhe.
4. T4: Implementar pagina CRM com tabs.

### Fase 2: Robustez, 2.5 a 4 dias

5. T5: Implementar campos customizados e regras por etapa.
6. T6: Corrigir fechamento ganho/perdido.
7. T7: Implementar historico comercial.
8. T8: Reposicionar WhatsApp como atividade.

### Fase 3: Melhorias, 0.5 a 1 dia

9. T9: Melhorar cards e lista.
10. T10: Completar testes e validacao.

**Total Estimado:** 7 a 10 dias uteis.

## Proximos Passos

1. Revisar a decisao de pagina dedicada.
2. Confirmar campos MVP de `Deal`.
3. Confirmar se `DealLineItem` deve permitir item livre desde o inicio.
4. Executar T1 a T4 antes de mexer em refinamentos visuais.

**Status:** pronto para planejamento de implementacao.
