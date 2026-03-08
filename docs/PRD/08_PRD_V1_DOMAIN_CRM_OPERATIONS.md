# PRD V1 Domain: CRM and Revenue Operations

## Objetivo

Garantir que a operação comercial sustentada pelo produto esteja consistente entre leads, tickets, vendas, itens, categorias e dashboards.

## Estado Implementado Hoje

Base já existente no código:

- leads em `src/app/dashboard/leads` e `src/app/api/v1/leads`
- tickets em `src/app/dashboard/tickets` e `src/app/api/v1/tickets`
- vendas em `src/app/dashboard/sales` e `src/app/api/v1/sales`
- itens em `src/app/dashboard/items` e `src/app/api/v1/items`
- categorias em `src/app/dashboard/item-categories` e `src/app/api/v1/item-categories`
- visão geral e analytics em `src/app/dashboard`, `src/app/dashboard/analytics` e `src/app/api/v1/dashboard/summary`

## Escopo Oficial da V1

Entra no launch:

- visualizar leads e tickets gerados pela operação
- registrar e exibir vendas
- manter catálogo de itens e categorias
- acompanhar visão geral do negócio no dashboard

Fica fora do esforço de hoje:

- refactor grande de CRM
- novas automações comerciais
- redesign de todas as telas operacionais

## Gaps Reais

- falta smoke de consistência entre os módulos após fluxo real de WhatsApp e IA
- é preciso validar se o fechamento por IA e o fechamento manual convergem no mesmo estado esperado
- analytics precisa ser tratado como suporte à operação, não como frente isolada de launch

## Tarefas de Hoje

1. Validar criação e atualização de lead a partir de mensagem real.
2. Validar ticket gerado, mudança de status e fechamento.
3. Validar venda criada após aprovação da IA.
4. Validar catálogo de itens e categorias usado no fluxo de aprovação.
5. Revisar dashboard principal para garantir que não há card quebrado ou dado vazio por falha simples de integração.

## Critérios de Aceite

- lead, ticket e venda permanecem consistentes após fluxo real
- item e categoria podem ser usados no fechamento operacional
- dashboard principal reflete o estado da operação sem erro bloqueante

## Riscos de Launch

- inconsistência entre CRM e IA destrói confiança na plataforma inteira
- analytics com dados vazios ou quebrados gera percepção de produto inacabado
