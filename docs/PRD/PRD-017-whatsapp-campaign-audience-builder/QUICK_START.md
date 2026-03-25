# Quick Start: PRD-017 WhatsApp Campaign Audience Builder

**Data:** 2026-03-25
**Status:** Draft

---

## Objetivo

Entregar a v2 do modulo de campanhas WhatsApp com:

- builder em pagina cheia
- audiencias persistidas
- listas, tags e segmentos
- variaveis resolvidas por origem
- envio manual ou agendado
- zero fluxo de aprovacao

---

## Configuracao da Branch

Este PRD segue o workflow **branch-per-feature** do nextjs-feature-dev.

### Step 1 — Criar feature branch

```bash
git checkout main && git pull origin main
git checkout -b feature/2026-03-25-whatsapp-campaign-audience-builder
```

### Step 2 — Primeiro commit e sempre o PRD

```bash
git add docs/PRD/PRD-017-whatsapp-campaign-audience-builder/
git commit -m "docs: add PRD for WhatsApp campaign audience builder"
```

### Step 3 — Cada task = um commit atomico

Durante a execucao, cada task recebe seu proprio commit com mensagem clara:

```bash
# Task 1
git commit -m "feat(whatsapp): add campaign audience builder schema"

# Task 5
git commit -m "feat(whatsapp): add contact list service with CSV import"

# Task 12
git commit -m "feat(whatsapp): add campaign variant stats and duplicate endpoint"

# Task 18
git commit -m "feat(whatsapp): add engagement funnel and recipient filters"
```

Veja exemplos completos em "Commit Messages por Task" abaixo.

---

## Ordem Recomendada de Leitura

1. `docs/PRD/PRD-001-whatsapp-disparo-em-massa/`
2. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/README.md`
3. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/CONTEXT.md`
4. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/DIAGNOSTIC.md`
5. `docs/PRD/PRD-017-whatsapp-campaign-audience-builder/TASKS.md`

---

## Ordem Recomendada de Execucao

1. Modelar banco e remover aprovacao do dominio (Tasks 1-2)
2. Backfillar `stageEnteredAt` e migrar estados legados de campanha (Task 3)
3. Implementar listas, tags e segmentos no backend (Tasks 4-8)
4. Refatorar campanhas para snapshot final no enviar/agendar (Tasks 9-12)
5. Substituir drawer por builder full-page e construir a tab `Audiencias` (Tasks 13-16)
6. Construir Campaign Builder v2 e UI de atribuicao de tags no CRM em paralelo (Tasks 17 e 19)
7. Limpar listagem/detalhe de campanhas e codigo morto (Task 18)

---

## Regras de Implementacao

### 1. Nao reabrir o fluxo de aprovacao

Esta feature assume decisao de produto fechada:

- nao existe mais `submit`
- nao existe mais `approve`
- nao existe mais `PENDING_APPROVAL`
- nao existe mais `APPROVED`

Se algum trecho antigo ainda depender disso, ele deve ser removido ou migrado para historico de eventos.

### 2. Lista nao e campanha

Importacao CSV passa a alimentar `listas`, nao `campaigns` diretamente.

Consequencia pratica:

- o parser CSV deve continuar robusto
- a UI de campanha nao deve exigir CSV como etapa obrigatoria

### 3. Snapshot e congelado no envio/agendamento

Nao resolver variaveis "ao vivo" durante a execucao de uma campanha ja agendada.

Fluxo correto:

1. usuario revisa
2. sistema resolve recipients + variaveis
3. sistema persiste snapshot
4. campanha e enviada agora ou marcada como `SCHEDULED`

### 4. Segmento usa CRM real, lista usa dados importados

- `Segmento` consulta `Lead` + `Ticket`
- `Lista` consulta `WhatsAppContactListMember`
- `Tag` so vale para leads

Nao misturar estes conceitos no schema nem na UI.

### 5. Custom fields genericos ficam fora

Se faltar dado no CRM, a v1 usa:

- coluna da lista importada
- valor fixo da campanha

Nao criar uma plataforma generica de campos customizados nesta entrega.

### 6. Dados faltantes sempre excluem destinatarios na v1

Nao introduzir um campo de configuracao `missingVariablesBehavior` nesta entrega.

Comportamento esperado:

- preview obrigatorio antes do envio
- destinatarios com variavel obrigatoria faltante sao excluidos do snapshot
- envio/agendamento so segue se houver ao menos um destinatario valido

---

## Campos CRM Minimos para Auto-mapeamento

O builder deve tentar auto-mapear pelo menos:

- `lead.name`
- `lead.phone`
- `lead.mail`
- `lead.source`
- `lead.lastMessageAt`
- `ticket.stage.name`
- `ticket.stageEnteredAt`
- `ticket.createdAt`

Qualquer coisa fora disso pode ser:

- coluna da lista, ou
- valor fixo

---

## Checklist de UX

- O usuario entende primeiro `quem vai receber`, depois `o que vai ser enviado`.
- A tela nao exige pensar em JSON, payload ou nomes internos de API.
- Variaveis faltantes aparecem com linguagem simples e acao clara.
- O preview informa quantos contatos serao enviados, excluidos e por qual motivo.
- O fluxo de criacao cabe em uma pagina cheia sem drawer.

---

## Arquitetura de Camadas (nextjs-conventions)

### `src/lib/whatsapp/`

- **`queries/`** — Leitura pura. Usam `'use cache'` + `cacheTag` para queries custosas (segment preview, list preview).
- **`actions/`** — Server Actions thin (5-15 linhas). Validacao Zod → delega para service → retorna `Result<T>`.
- **`services/`** — Lógica de negócio. Orquestra operações, retorna `Result<T>`. Nunca throw para erros esperados.
- **`api-client/`** — Cliente HTTP para APIs internas/externas. NÃO va em `src/hooks`.
- **`schemas/`** — Validação Zod para todos os limites: Server Actions, route handlers, webhooks, env vars.
- **`types/`** — TypeScript types específicos do domínio.

### `src/app/api/v1/whatsapp/`

- Route handlers thin (10-20 linhas).
- Parse input → validate com Zod → call service → respond com `apiSuccess`/`apiError`.
- Nunca importar Prisma diretamente. Sempre via service.

### `src/components/dashboard/whatsapp/`

- Server Components por padrão.
- Fetch data em Server Components, passe props para Client Components.
- `'use client'` APENAS para hooks, event handlers, browser APIs.

### `src/services/whatsapp/` (LEGADO)

Domínios já existentes usam `src/services/`. Para PRD-017, usar `src/lib/whatsapp/services/` para nova lógica.

---

## Checklist Tecnico

- [x] Route handlers continuam thin (10-20 linhas max)
- [x] Services concentram regra de negocio, retornam `Result<T>`
- [x] Zod em todos os payloads novos (schemas em `src/schemas/whatsapp/`)
- [x] `stageEnteredAt` atualizado em toda mudanca de fase
- [x] Structured logging com Pino: `logger.info({ context }, 'message')`
- [x] Server Components por padrao, `'use client'` apenas quando necessario
- [x] Atomic commits: cada task = um commit feat/test/refactor
- [x] Testes cobrindo:
  - Resolver de variaveis (unit test de service)
  - Deduplicacao de lista (unit test de service)
  - Preview de segmento (unit test)
  - Snapshot de campanha agendada (integration test)
  - Remocao do fluxo de aprovacao (migration test)

---

## Verificacao Sugerida

```bash
npm test -- src/services/whatsapp/__tests__/whatsapp-campaign.service.test.ts
npm test -- src/services/whatsapp/__tests__/whatsapp-campaign-execution.service.test.ts
npm test -- src/lib/whatsapp/__tests__/campaign-csv.test.ts
```

Adicionar suites novas para:

- `whatsapp-contact-list.service`
- `whatsapp-lead-tag.service`
- `whatsapp-audience-segment.service`
- `whatsapp-campaign-variable-resolver.service`

---

## Commit Messages por Task

Cada task recebe seu proprio commit atomico. Exemplos:

```bash
# Fase 1: Schema + Migration
Task 1: git commit -m "feat(whatsapp): add audience builder schema and models"
Task 2: git commit -m "feat(whatsapp): remove approval flow from campaign domain"
Task 3: git commit -m "feat(whatsapp): backfill stageEnteredAt and migrate legacy campaign states"

# Fase 2: Backend Services
Task 4: git commit -m "feat(whatsapp): add audience schemas with zod validation"
Task 5: git commit -m "feat(whatsapp): add contact list service with CSV import"
Task 6: git commit -m "feat(whatsapp): add lead tag service and CRUD operations"
Task 7: git commit -m "feat(whatsapp): add audience segment service with CRM filters"
Task 8: git commit -m "feat(whatsapp): expose thin route handlers for lists, tags, segments"

# Fase 3: Campaign Refactor
Task 9: git commit -m "feat(whatsapp): refactor campaign service for new audience flow"
Task 20: git commit -m "feat(whatsapp): add campaign duplicate service"
Task 10: git commit -m "feat(whatsapp): add campaign variable resolver service"
Task 11: git commit -m "feat(whatsapp): freeze campaign recipient snapshot on dispatch"
Task 12: git commit -m "feat(whatsapp): update campaign routes with stats, filtering, duplicate"

# Fase 4: UI Builder
Task 13: git commit -m "feat(whatsapp): migrate campaign creation from drawer to full-page builder"
Task 14: git commit -m "feat(whatsapp): add audiences tab to campaigns hub"
Task 15: git commit -m "feat(whatsapp): build contact lists UI with import"
Task 16: git commit -m "feat(whatsapp): build tags and segments UI"
Task 17: git commit -m "feat(whatsapp): build campaign builder v2 with 5 steps"
Task 19: git commit -m "feat(whatsapp): add tag assignment in CRM (lead detail and ticket panel)"
Task 18: git commit -m "feat(whatsapp): add engagement funnel and recipient filters to campaign detail"
```

---

## Logging e Validacao por Task

Cada task de service deve incluir:

1. **Structured Pino logging** em pontos criticos:
   ```typescript
   logger.info({ listId, memberCount }, '[ContactList] Imported members')
   logger.error({ err, listId }, '[ContactList] Import failed')
   ```

2. **Zod validation** em boundaries:
   - Server Action input: `WhatsAppContactListCreateSchema.parse(input)`
   - Route handler body: payload validado antes de delegar
   - Webhook: eventos validados antes de processar

3. **Result<T> return type** em services:
   ```typescript
   return { success: true, data: ... }
   return { success: false, error: 'message' }
   ```

---

## Resultado Esperado ao Final

Ao final da implementacao, a area `/whatsapp/campaigns` deve funcionar como um modulo administrativo completo:

- gerencia audiencia (listas, tags, segmentos)
- cria campanha sem drawer (builder em pagina cheia)
- resolve variaveis com previsibilidade (CRM, coluna lista, valor fixo)
- envia ou agenda sem aprovacao (DRAFT → SCHEDULED → PROCESSING → COMPLETED)
- acompanha o resultado de ponta a ponta (funil de engajamento, filtro de destinatarios, duplicate)
