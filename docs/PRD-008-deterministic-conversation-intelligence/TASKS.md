# Tasks

## DCI-001: Definir schema Zod do DTO

Estimativa: 2h
Severidade: Alta

Localização:
- `src/features/conversation-intelligence/schemas/conversation-intelligence.schemas.ts`

O que fazer:
- Criar schema Zod para o `ConversationIntelligenceDTO` completo conforme CONTEXT.md.
- Exportar tipos TypeScript inferidos.

Critérios de aceitação:
- Schema cobre todas as seções: `timing`, `volume`, `pipeline`, `lead`, `attribution`.
- Todos os campos nullable explicitamente tipados.
- Nenhum campo interpretativo (sem enums de status, sem labels).

## DCI-002: Criar repository

Estimativa: 4h
Severidade: Alta

Localização:
- `src/features/conversation-intelligence/repositories/conversation-intelligence.repository.ts`

O que fazer:
- Buscar `Conversation`, `Deal`, `Lead`, `DealTracking` por `conversationId` + `organizationId`.
- `select` explícito em todos os campos necessários para o DTO.
- Queries independentes em `Promise.all` onde aplicável.

Critérios de aceitação:
- Toda query filtra por `organizationId`.
- Não retorna campos sensíveis (`rawMeta`, tokens, webhooks).
- `select` explícito — sem `select *`.
- Retorna `null` para deal quando não há deal aberto.

## DCI-003: Criar service

Estimativa: 4h
Severidade: Alta

Localização:
- `src/features/conversation-intelligence/services/conversation-intelligence.service.ts`

O que fazer:
- Receber `organizationId` + `conversationId`.
- Chamar repository.
- Computar todas as derivações matemáticas conforme CONTEXT.md.
- Validar saída com Zod.
- Retornar `{ data }` ou `{ error, status }`.

Critérios de aceitação:
- Nenhuma interpretação — só math.
- `computedAt` = timestamp do momento do cálculo.
- Service funciona sem deal aberto (retorna campos `pipeline` e `timing` com nulls).
- Saída validada pelo schema.

## DCI-004: Criar endpoint

Estimativa: 2h
Severidade: Alta

Localização:
- `src/app/api/v1/conversations/[conversationId]/intelligence/route.ts`

O que fazer:
- `GET` handler.
- Autenticar com `validatePermissionAccess(request, 'view:deals')`.
- Chamar service.
- Retornar JSON validado.

Critérios de aceitação:
- Sem mutação.
- Sem LLM.
- Sem dados sensíveis no response.
- Erro de permissão retorna 401.
- Conversa não encontrada retorna 404.

## DCI-005: Criar componente acordeão

Estimativa: 8h
Severidade: Alta

Localização:
- `src/features/conversation-intelligence/components/conversation-intelligence-panel.tsx`
- `src/features/conversation-intelligence/components/skeletons/conversation-intelligence-skeleton.tsx`

O que fazer:
- Client Component com TanStack Query: `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`.
- Cinco seções colapsáveis: Atendimento, Mensagens, Pipeline, Lead, Origem.
- Seções sem dados são ocultadas.
- Formatar segundos em "Xh Ymin" ou "Ymin Zs" conforme magnitude.
- Formatar `lifetimeValue` em BRL.
- Janela WhatsApp: mostrar tempo restante (positivo) ou "Expirada há X" (negativo) ou "Sem janela".
- `windowSecondsRemaining < 0` → texto "Expirada há Xh".
- Criar skeleton que espelha dimensões reais do painel.
- Integrar em `deal-panel.tsx`.

Critérios de aceitação:
- Nenhum label interpretativo na UI (sem "Aguardando", "Frio", "Atenção").
- Estados `loading`, `error`, `empty` (sem deal) tratados.
- Skeleton fiel ao layout real.
- Números exibidos sem julgamento de valor.
- UI não menciona IA.

## DCI-006: Testes

Estimativa: 4h
Severidade: Alta

O que fazer:
- Testes unitários das derivações matemáticas do service.
- Testes do schema (rejeita campos inválidos).
- Fixtures com dados de entrada variados.

Critérios de aceitação:
- `now` sempre injetado por parâmetro — nenhum teste usa `new Date()` direto.
- Cobrir: sem deal, sem tracking, `lastInboundAt` null, `windowExpiresAt` no passado, `stageEnteredAt` null.
- Schema rejeita tipos errados.
- `windowSecondsRemaining` negativo para janela expirada.

## Ordem de implementação

1. DCI-001
2. DCI-002
3. DCI-003
4. DCI-004
5. DCI-005
6. DCI-006

## Estimativa Total

24h a 32h.
