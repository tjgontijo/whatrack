# Legacy AI Scope

**Data:** 2026-03-21
**Status:** Historical Memory
**Contexto:** este documento registra, de forma descritiva, o escopo da implementacao antiga de IA que existia antes do hard delete do PRD-011. Ele nao define o sistema novo e nao deve ser tratado como fonte de verdade para reintroducao tecnica sem revisao.

---

## Resumo

Antes do teardown, o WhaTrack tinha um stack de IA orientado a:

- gerar insights e sugestoes a partir de conversas e eventos
- exigir aprovacao humana para parte relevante dessas acoes
- manter um AI Studio acoplado a agentes, skills e bindings
- rodar classificacao assincrona de conversas via scheduler
- apoiar fluxos paralelos de Meta Ads Audit e Meta Ads Copilot

Era um sistema mais passivo do que operacional. Em vez de um agente responder diretamente no WhatsApp, o modelo antigo produzia artefatos intermediarios como `AiInsight` para revisao, aprovacao ou consumo indireto por outras telas.

---

## Objetivo Do Stack Antigo

O objetivo implicito da arquitetura anterior era dar ao produto uma camada de IA multifuncional, capaz de:

- classificar conversas e detectar sinais comerciais
- sugerir acoes ou resumos para operadores
- organizar skills reaproveitaveis por organizacao
- oferecer um studio de configuracao para agentes e bindings
- disparar analises paralelas para Meta Ads

Na pratica, isso resultou em um conjunto heterogeneo de capacidades, sem um runtime unico e sem um contrato claro de execucao ponta a ponta.

---

## Modelo Conceitual Antigo

O sistema antigo girava em torno de alguns conceitos centrais:

### `AiAgent`

Representava um agente configuravel por organizacao. O agente tinha:

- nome
- prompt base (`leanPrompt`)
- modelo
- status ativo/inativo
- bindings de skills
- triggers
- schema fields

Era o centro conceitual do AI Studio antigo.

### `AiSkill`

Representava uma skill em formato legado, persistida como conteúdo em blob/texto.

Tinha atributos como:

- `slug`
- `name`
- `description`
- `content`
- `kind`
- `source`
- `isActive`

O modelo permitia skills compartilhadas ou associadas a agentes, mas sem o contrato file-based/versionado que passou a ser desejado depois.

### `AiAgentSkill`

Ligava agentes a skills com:

- ordenacao
- ativacao
- binding explicito por agente

Esse binding sustentava a UI antiga de agent-skill bindings.

### `AiTrigger` e tabelas auxiliares

O runtime antigo previa disparo por eventos com:

- `AiTrigger`
- `AiTriggerEventType`
- `AiSchemaField`
- `AiSchemaFieldType`

Isso apontava para uma plataforma de automacao orientada a eventos, mas o uso real no produto ficou parcial e inconsistente.

### `AiInsight`

Era o principal artefato operacional do sistema antigo.

Em vez de executar diretamente uma acao final, o stack gerava um insight contendo:

- `organizationId`
- `ticketId`
- `agentId`
- `eventType`
- `payload`
- `status`

Esse insight era então consumido por telas e fluxos de aprovacao manual.

### `AiInsightCost`

Registrava metrica de custo e tokens por insight, incluindo:

- feature
- operation
- agentName
- eventType
- input/output/total tokens
- modelo utilizado
- custo
- latencia
- status

Essa tabela alimentava a narrativa de usage/cost do stack antigo.

### `AiConversionApproval`

Era uma superficie paralela para aprovacao de conversoes ligadas a tickets. Apesar do nome diferente, fazia parte do mesmo universo conceitual de IA assistiva com aprovacao humana.

---

## Fluxos Principais Que Existiam

### 1. Classificacao Assincrona De Conversas

O inbound do WhatsApp nao encerrava em uma resposta automatica do agente. Em vez disso:

1. a mensagem chegava no handler principal
2. o sistema persistia lead, conversation, ticket e message
3. o handler enfileirava classificacao assincrona
4. um cron/classifier processava o trabalho depois
5. o resultado podia gerar insights ou efeitos secundarios

Esse desenho deixava a IA fora do caminho principal de resposta ao usuario.

### 2. Fluxo De Insights E Aprovacao Manual

Uma vez gerado, o `AiInsight` seguia para superficies de leitura e aprovacao. Isso aparecia em:

- inbox
- painéis de AI approvals
- endpoints de approve/reject
- telas dedicadas do AI Studio

O produto, portanto, tratava a IA como copilot interno e nao como runtime conversacional ativo.

### 3. AI Studio Antigo

Havia uma UI dedicada para:

- listar agentes
- editar agentes
- listar skills
- editar skills
- vincular skills a agentes
- consultar usage/logs

Essa UX era fortemente acoplada ao schema legado e ao conceito de binding entre `AiAgent` e `AiSkill`.

### 4. Meta Ads Audit

O stack antigo nao se limitava ao WhatsApp. Existia um caminho paralelo em Meta Ads que dependia de IA para:

- pedir auditoria
- gerar análise
- exibir drawer de resultado

Esse fluxo não compartilhava um runtime realmente unificado com o restante do sistema; era mais uma integração paralela sobre o mesmo universo de IA.

### 5. Meta Ads Copilot

Além do audit, havia um Copilot específico com:

- rota própria
- service próprio
- CTAs e drawers no frontend

Ou seja, o produto já carregava mais de uma “experiência de IA” ao mesmo tempo.

### 6. Provisioning No Onboarding E Na Organizacao

Na criação e no onboarding de organizações, o sistema provisionava artefatos antigos automaticamente, em especial skills base.

Isso fazia com que o legado continuasse nascendo mesmo sem uso explícito da UI.

---

## Superficies De Produto Que Existiam

### Backend

O backend antigo incluía serviços como:

- `ai-agent.service.ts`
- `ai-classifier.scheduler.ts`
- `ai-execution.service.ts`
- `ai-execution-audit.service.ts`
- `ai-insight-approval.service.ts`
- `ai-insight-query.service.ts`
- `ai-skill-provisioning.service.ts`
- `ai-skill.service.ts`
- `ai-cost-tracking.service.ts`

### APIs

As rotas expostas incluíam:

- `/api/v1/ai-agents`
- `/api/v1/ai-insights`
- `/api/v1/ai-skills`
- `/api/v1/ai/usage`
- `/api/v1/cron/ai/classifier`
- `/api/v1/organizations/ai-settings`
- `/api/v1/meta-ads/audit`
- `/api/v1/meta-ads/copilot-analyze`

### Frontend

As principais superfícies de UI incluíam:

- `/settings/ai-studio`
- `/settings/ai/*`
- `/ia`
- `/ai/usage`
- `/approvals`
- componentes de approvals
- skill library
- agent-skill bindings
- painel de insight/aprovação dentro da inbox
- drawers de audit/copilot no Meta Ads

### RBAC E Config

O produto ainda expunha:

- permissões `view:ai` e `manage:ai`
- configuração organizacional de IA
- campos `aiCopilotActive` e `aiCopilotInstructions`
- nomenclatura de IA na navegação e em settings

### Billing E Metrica

Mesmo fora do runtime principal, havia rastros de IA em billing e métricas, como:

- franquia de créditos de IA por projeto
- uso de tokens/custos no ecossistema antigo
- superfícies que reforçavam a ideia de IA como entitlement de plataforma

---

## Onde O Stack Antigo Era Mais Engessado

Os principais pontos de rigidez eram:

### Arquitetura fragmentada

O produto tinha múltiplos caminhos de IA:

- classifier assíncrono
- insights com aprovação
- AI Studio legado
- Meta Ads Audit
- Meta Ads Copilot

Isso aumentava custo cognitivo e dificultava consolidar um runtime único.

### Dependência de aprovação manual

A IA antiga raramente era o executor final do fluxo. Ela gerava sugestão, resumo ou insight para consumo posterior.

### Modelagem centrada em agente/binding

O eixo `AiAgent -> AiAgentSkill -> AiSkill` prendia a configuração a uma estrutura pouco flexível para o runtime desejado depois, especialmente para WhatsApp project-scoped.

### Acoplamento com nomenclatura herdada

Permissões, settings, páginas e billing ainda falavam em IA, o que poluía o produto mesmo fora do uso real.

### Provisioning automático do legado

O onboarding e a criação de organização continuavam semeando a arquitetura antiga, impedindo uma limpeza gradual de verdade.

---

## Escopo Real Que Foi Apagado No PRD-011

Em termos de memória histórica, o PRD-011 removeu:

- schema legado de IA
- serviços e testes do runtime antigo
- APIs públicas e internas do stack antigo
- UI de AI Studio, approvals, usage e `/ia`
- integrações da inbox com insights
- Meta Ads Audit dependente da arquitetura antiga
- Meta Ads Copilot
- permissões e settings expostos de IA
- provisionamento automático de skills antigas
- créditos de IA em billing e métricas associadas

---

## Valor Deste Registro

Este documento existe para preservar memória de produto e arquitetura:

- explicar por que o teardown do PRD-011 foi amplo
- evitar que o time esqueça o que era o sistema removido
- servir de referência histórica para decisões futuras
- impedir reintrodução acidental dos mesmos acoplamentos

Ele não deve ser lido como blueprint de implementação. O sistema novo deve ser definido pelos PRDs posteriores e não por este legado.
