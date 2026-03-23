# Tasks: PRD-017 WhatsApp Campaign Audience Builder

**Data:** 2026-03-22
**Status:** Draft
**Total:** 19
**Estimado:** 3 a 4 sprints

---

## Fase 1: Modelagem e simplificacao do dominio

### Task 1: Adicionar modelos de tags, listas, segmentos e eventos de campanha

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_whatsapp_campaign_audience_builder/migration.sql`

**What to do:**
- Criar `LeadTag` e `LeadTagAssignment`.
- Criar `WhatsAppContactList` e `WhatsAppContactListMember` (colunas arbitrarias do membro em campo `data Json`).
- Criar `WhatsAppAudienceSegment` (filtros em campo `filters Json`).
- Criar `WhatsAppCampaignEvent` com os campos `id`, `campaignId`, `type` (enum `WhatsAppCampaignEventType`), `userId?`, `metadata Json?`, `createdAt`. Ver enum completo em CONTEXT.md.
- Adicionar em `Ticket` o campo `stageEnteredAt DateTime?`.
- Adicionar em `WhatsAppCampaign`: `audienceSourceType` (enum `LIST | SEGMENT`) e `audienceSourceId`. Verificar se `name` ja existe; se nao, adicionar.

**Verification:**
- `prisma validate` passa.
- A migration cria as novas tabelas/indices esperados.
- O enum `WhatsAppCampaignEventType` contem todos os tipos definidos em CONTEXT.md.

**Depends on:** None

### Task 2: Remover o conceito de aprovacao do schema de campanhas e dropar tabelas legadas

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/<timestamp>_whatsapp_campaign_audience_builder/migration.sql`

**What to do:**
- Remover `WhatsAppCampaignApproval`.
- Remover campos e relacoes de aprovacao em `WhatsAppCampaign` (`approvedById`, `approvedAt`).
- Atualizar a documentacao de status da campanha para `DRAFT | SCHEDULED | PROCESSING | COMPLETED | CANCELLED`.
- Dropar `WhatsAppCampaignImport`: o novo fluxo passa por `WhatsAppContactList/Member`. Antes do drop, verificar se ha dados uteis para migrar para `WhatsAppCampaignEvent.metadata`. Nao manter como read-only.

**Verification:**
- O schema nao referencia mais `APPROVED`, `PENDING_APPROVAL`, a tabela de aprovacao nem `WhatsAppCampaignImport`.

**Depends on:** Task 1

### Task 3: Backfillar `stageEnteredAt` e compatibilizar dados legados de campanha

**Files:**
- Modify: `prisma/migrations/<timestamp>_whatsapp_campaign_audience_builder/migration.sql`
- Create: `scripts/backfill-whatsapp-campaign-stage-entered-at.ts`
- Modify: `src/services/tickets/ticket.service.ts`
- Modify: `src/services/whatsapp/whatsapp-chat.service.ts`
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- Definir regra de backfill para tickets existentes (usar `updatedAt` ou `createdAt` como aproximacao, documentar a escolha).
- Migrar campanhas em estados removidos conforme regra definida em CONTEXT.md:
  - `PENDING_APPROVAL` → `DRAFT`
  - `APPROVED` → `DRAFT`
  - demais estados permanecem como estao
- Para cada campanha migrada, inserir um evento `LEGACY_STATUS_MIGRATED` com `metadata: { fromStatus, toStatus }`.
- Instrumentar os fluxos futuros para manter `stageEnteredAt` correto:
  - setar valor inicial ao criar ticket
  - resetar para `new Date()` sempre que `stageId` mudar
  - revisar fluxos de WhatsApp que criam ou reabrem tickets fora do caminho principal
- Documentar no script e no comentario SQL qual aproximacao foi usada.

**Verification:**
- O script roda sem erro em ambiente local.
- Tickets antigos ficam com `stageEnteredAt` nao nulo.
- Campanhas em `PENDING_APPROVAL`/`APPROVED` viram `DRAFT` com evento registrado.
- Mudancas futuras de fase atualizam `stageEnteredAt` de forma consistente.

**Depends on:** Task 2

---

## Fase 2: Backend de audiencias

### Task 4: Criar schemas zod para listas, tags e segmentos

**Files:**
- Create: `src/schemas/whatsapp/whatsapp-audience-schemas.ts`
- Modify: `src/schemas/whatsapp/whatsapp-campaign-schemas.ts`
- Test: `src/schemas/whatsapp/__tests__/whatsapp-audience-schemas.test.ts`

**What to do:**
- Definir payloads de CRUD para listas, tags e segmentos.
- Definir schema de preview de segmento.
- Atualizar os payloads de campanha para receber origem de audiencia e mapeamento de variaveis.

**Verification:**
- Os testes cobrem casos validos e invalidos.

**Depends on:** Task 3

### Task 5: Implementar servico de listas de contatos

**Files:**
- Create: `src/services/whatsapp/whatsapp-contact-list.service.ts`
- Create: `src/services/whatsapp/whatsapp-contact-list-query.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-contact-list.service.test.ts`

**What to do:**
- Criar CRUD de listas.
- Implementar importacao de membros com deduplicacao por telefone normalizado.
- Persistir colunas arbitrarias da lista em JSON por membro.
- Reaproveitar o parser CSV atual quando fizer sentido.

**Verification:**
- E possivel criar lista, importar membros e listar contagem correta.

**Depends on:** Task 4

### Task 6: Implementar servico de tags de leads

**Files:**
- Create: `src/services/whatsapp/whatsapp-lead-tag.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-lead-tag.service.test.ts`

**What to do:**
- Criar CRUD de tags.
- Criar atribuicao e remocao de tags em leads.
- Garantir escopo por organizacao.

**Verification:**
- O servico impede duplicidade de tag por lead e respeita o escopo da organizacao.

**Depends on:** Task 4

### Task 7: Implementar servico de segmentos salvos do CRM

**Files:**
- Create: `src/services/whatsapp/whatsapp-audience-segment.service.ts`
- Create: `src/services/whatsapp/whatsapp-audience-segment-query.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-audience-segment.service.test.ts`

**What to do:**
- Persistir segmentos com filtros por projeto, origem, tag, status do lead, fase, dias na fase e ultima atividade (`lead.lastMessageAt`).
- Implementar preview de contagem e amostra de leads.
- Usar `stageEnteredAt` para filtros de "ha X dias na fase".

**Verification:**
- Segmentos retornam preview consistente com filtros basicos, pipeline e ultima atividade.

**Depends on:** Task 6

### Task 8: Expor endpoints thin para listas, tags e segmentos

**Files:**
- Create: `src/app/api/v1/whatsapp/audiences/lists/route.ts`
- Create: `src/app/api/v1/whatsapp/audiences/lists/[listId]/route.ts`
- Create: `src/app/api/v1/whatsapp/audiences/lists/[listId]/import/route.ts`
- Create: `src/app/api/v1/whatsapp/lead-tags/route.ts`
- Create: `src/app/api/v1/whatsapp/lead-tags/[tagId]/route.ts`
- Create: `src/app/api/v1/whatsapp/audiences/segments/route.ts`
- Create: `src/app/api/v1/whatsapp/audiences/segments/[segmentId]/route.ts`
- Create: `src/app/api/v1/whatsapp/audiences/segments/preview/route.ts`

**What to do:**
- Implementar rotas finas com `validateFullAccess`/`validatePermissionAccess`.
- Validar payloads com zod.
- Delegar tudo para services/queries.

**Verification:**
- Todos os endpoints retornam 400/403/404 corretos nos casos esperados.

**Depends on:** Task 7

---

## Fase 3: Simplificacao do dominio de campanhas

### Task 9: Atualizar schemas e services de campanha para o novo fluxo sem aprovacao

**Files:**
- Modify: `src/schemas/whatsapp/whatsapp-campaign-schemas.ts`
- Modify: `src/services/whatsapp/whatsapp-campaign.service.ts`
- Modify: `src/services/whatsapp/whatsapp-campaign-query.service.ts`
- Modify: `src/services/whatsapp/whatsapp-campaign-audience.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign.service.test.ts`

**What to do:**
- Remover `submitForApproval` e `approveCampaign`.
- Atualizar regras de status.
- Atualizar `createCampaign`, `updateCampaign`, `dispatchCampaign` e `cancelCampaign`.
- Trocar o historico de aprovacao por eventos de campanha.
- Refatorar `whatsapp-campaign-audience.service.ts` para remover o fluxo antigo de audiencia ad hoc centrado em `CRM | IMPORT | MIXED` inline na campanha e preparar sua reutilizacao no novo builder.

**Verification:**
- Os testes de service cobrem apenas o novo conjunto de estados.

**Depends on:** Task 8

### Task 10: Implementar resolvedor de variaveis da campanha

**Files:**
- Create: `src/services/whatsapp/whatsapp-campaign-variable-resolver.service.ts`
- Modify: `src/services/whatsapp/whatsapp-campaign-audience.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-variable-resolver.service.test.ts`

**What to do:**
- Receber template, audiencia selecionada e mapa de variaveis.
- Suportar origens `crm_field`, `list_column` e `fixed_value`.
- Gerar resumo de `resolvidas`, `faltantes`, `excluidas` e `duplicadas`.
- Integrar ou absorver explicitamente as partes uteis do `whatsapp-campaign-audience.service.ts` no novo pipeline de preview/montagem da audiencia persistida.

**Verification:**
- O servico resolve corretamente variaveis vindas de CRM, lista e valor fixo.

**Depends on:** Task 9

### Task 11: Congelar snapshot de destinatarios no enviar/agendar

**Files:**
- Modify: `src/services/whatsapp/whatsapp-campaign.service.ts`
- Modify: `src/services/whatsapp/whatsapp-campaign-execution.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-execution.service.test.ts`

**What to do:**
- Mover o congelamento final de recipients/variables para o momento de `enviar` ou `agendar`.
- Persistir no `WhatsAppCampaignRecipient` o payload de variaveis final por destinatario.
- Garantir que campanhas agendadas nao re-resolvam valores depois.

**Verification:**
- Uma campanha agendada mantem o mesmo snapshot mesmo que a audiencia mude depois.

**Depends on:** Task 10

### Task 12: Atualizar rotas de campanha e remover endpoints de aprovacao

**Files:**
- Modify: `src/app/api/v1/whatsapp/campaigns/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/preview/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/dispatch/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/cancel/route.ts`
- Modify: `src/app/api/v1/whatsapp/campaigns/[campaignId]/recipients/route.ts`
- Delete: `src/app/api/v1/whatsapp/campaigns/[campaignId]/submit/route.ts`
- Delete: `src/app/api/v1/whatsapp/campaigns/[campaignId]/approve/route.ts`
- Delete: `src/app/api/v1/whatsapp/campaigns/import/route.ts`
- Delete: `src/app/api/v1/whatsapp/campaigns/[campaignId]/add-audience/route.ts`

**What to do:**
- Ajustar payloads para a nova origem de audiencia e preview.
- Reaproveitar `campaigns/preview` como preview do builder para cobertura de variaveis, exclusoes e snapshot antes do envio.
- Manter `campaigns/[campaignId]/recipients` como leitura paginada do snapshot final persistido em `WhatsAppCampaignRecipient`.
- Remover endpoints mortos de aprovacao.
- Remover endpoints legados de importacao direta e `add-audience` avulso, substituidos pela administracao de listas/audiencias.
- Garantir que o cron continue processando apenas `SCHEDULED`.

**Verification:**
- Nenhuma rota restante referencia submit/approve.
- O conjunto de rotas legadas tem disposicao explicita e coerente com o novo fluxo.

**Depends on:** Task 11

---

## Fase 4: UI de audiencias e builder

### Task 13: Trocar o drawer por rotas full-page de builder

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/campaigns/new/page.tsx`
- Create: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/campaigns/[campaignId]/edit/page.tsx`
- Modify: `src/components/dashboard/whatsapp/campaigns/campaigns-page.tsx`
- Delete: `src/components/dashboard/whatsapp/campaigns/campaign-form-drawer.tsx`

**What to do:**
- Fazer `new` e `edit` renderizarem o builder em pagina cheia.
- Remover o uso de drawer na listagem.
- Reutilizar o padrao de experiencia usado no editor de templates.

**Verification:**
- `Nova campanha` navega para rota dedicada, sem abrir drawer.

**Depends on:** Task 12

### Task 14: Adicionar a tab `Audiencias` ao hub de campanhas

**Files:**
- Modify: `src/components/dashboard/whatsapp/campaigns/campaigns-page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/audiences-tab.tsx`

**What to do:**
- Trocar as tabs atuais para `Visao Geral | Campanhas | Audiencias`.
- Definir estados de busca/filtro por tab.
- Exibir empty states e navegacao consistentes com o shell atual.

**Verification:**
- A tela principal de campanhas exibe a nova tab e alterna corretamente entre conteudos.

**Depends on:** Task 13

### Task 15: Construir UI de listas de contatos

**Files:**
- Create: `src/components/dashboard/whatsapp/campaigns/contact-lists-view.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/contact-list-editor.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/contact-list-import-sheet.tsx`
- Modify: `src/lib/whatsapp/campaign-csv.ts`
- Test: `src/lib/whatsapp/__tests__/campaign-csv.test.ts`

**What to do:**
- Criar listagem, criacao e importacao CSV para listas.
- Adaptar o parser atual para importar listas sem exigir um modelo identico ao template.
- Mostrar preview de colunas detectadas, validos, invalidos e duplicados.

**Verification:**
- O usuario consegue criar uma lista e importar contatos com colunas arbitrarias.

**Depends on:** Task 14

### Task 16: Construir UI de tags e segmentos

**Files:**
- Create: `src/components/dashboard/whatsapp/campaigns/lead-tags-view.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/audience-segments-view.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/audience-segment-editor.tsx`

**What to do:**
- Exibir CRUD de tags.
- Exibir CRUD de segmentos.
- Permitir preview de quantidade e exemplo de leads antes de salvar segmento.

**Verification:**
- O usuario consegue salvar um segmento com filtros de pipeline e visualizar o preview.

**Depends on:** Task 15

### Task 17: Construir o Campaign Builder v2

**Files:**
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-audience-step.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-template-step.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-variable-mapping-step.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder-review-step.tsx`
- Modify: `src/lib/whatsapp/client.ts`

**What to do:**
- Criar builder em pagina cheia com as etapas:
  1. **Basico e Audiencia**: nome da campanha (editavel no header sticky), instancia de envio, selecao da fonte de audiencia (lista OU segmento — exclusivo)
  2. **Template**: selecao do template aprovado pela Meta
  3. **Dados do template**: mapeamento de variaveis por origem (CRM, coluna da lista, valor fixo)
  4. **Revisao**: preview de cobertura, excluidos, duplicados e contagem final
  5. **Envio/agendamento**: enviar agora ou definir data/hora
- Auto-mapear variaveis conhecidas do CRM.
- Exibir preview claro de faltantes e permitir escolher `CRM`, `lista` ou `valor fixo`.

**Verification:**
- Uma campanha pode ser criada sem CSV direto, usando lista ou segmento salvo.
- O nome e visivel e editavel desde o primeiro render do builder.
- Nao e possivel selecionar lista e segmento ao mesmo tempo.

**Depends on:** Task 16

### Task 19: Atribuicao de tags no CRM (lead detail e ticket panel)

**Files:**
- Modify: `src/components/dashboard/leads/new-lead-drawer.tsx`
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`

**What to do:**
- Adicionar seccao de tags no detalhe do lead (`new-lead-drawer.tsx`) com:
  - lista de tags aplicadas ao lead
  - campo para buscar e aplicar nova tag (tags da organizacao)
  - acao para remover tag aplicada
- Adicionar o mesmo controle no painel de ticket do inbox (`ticket-panel.tsx`), onde o lead associado ao ticket pode ter tags atribuidas/removidas.
- Consumir os endpoints de lead-tags criados na Task 8.

**Verification:**
- O usuario consegue aplicar e remover tags em um lead a partir do detalhe do lead.
- O usuario consegue aplicar e remover tags a partir do painel do ticket no inbox.
- Um segmento por tag retorna apenas leads que ja tem a tag atribuida.

**Depends on:** Task 8

---

### Task 18: Atualizar listagem/detalhe de campanhas e limpar codigo morto

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/campaigns/[campaignId]/page.tsx`
- Modify: `src/components/dashboard/whatsapp/campaigns/campaigns-overview.tsx`
- Delete: `src/components/dashboard/whatsapp/campaigns/campaign-wizard-step-basic.tsx`
- Delete: `src/components/dashboard/whatsapp/campaigns/campaign-wizard-step-recipients.tsx`
- Delete: `src/components/dashboard/whatsapp/campaigns/campaign-wizard-step-dispatch.tsx`

**What to do:**
- Trocar historico de aprovacao por historico de eventos.
- Exibir origem da audiencia, cobertura de variaveis e resumo do snapshot.
- Remover componentes mortos do wizard antigo.

**Verification:**
- Nenhum componente ativo da area de campanhas depende mais do drawer/wizard antigo.

**Depends on:** Task 17

---

## Ordem de Execucao

`1 -> 2 -> 3 -> 4 -> [5 || 6] -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> [17 || 19] -> 18`

Observacoes:

- Tasks 5 e 6 podem ser executadas em paralelo (ambas dependem de Task 4, sao independentes entre si).
- Tasks 17 e 19 podem ser executadas em paralelo (builder de campanha e tag UI no CRM sao areas distintas).
- Task 8 depende de Tasks 5 e 7 (expoe endpoints de listas e de segmentos).

---

## Observacoes de Escopo

- Nao introduzir custom fields genericos no CRM nesta entrega.
- O builder deve priorizar UX simples e linguagem de negocio, nao termos tecnicos de payload.
- O parser CSV deve diferenciar claramente:
- importacao de lista
- importacao antiga acoplada a template, que sera descontinuada
