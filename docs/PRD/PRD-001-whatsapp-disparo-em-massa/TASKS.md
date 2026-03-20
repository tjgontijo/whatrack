# Tasks: PRD-001 WhatsApp Disparo em Massa via API Oficial

**Data:** 2026-03-19
**Status:** Draft
**Total:** 14
**Estimado:** 2 a 3 sprints

---

## Fase 1: Modelagem e Contratos

### T1: Modelar entidades Prisma de campanha

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- Adicionar as entidades de campanha, grupos de envio, destinatarios, aprovacoes e importacoes.
- Definir estados minimos da campanha e do destinatario.
- Garantir vinculo com `organizationId`, `projectId`, `WhatsAppConfig` e opcionalmente `Lead`.

**Verification:**
- `npx prisma validate`
- Revisar se a modelagem suporta destinatario importado sem `leadId`.

---

### T2: Criar schemas Zod do dominio de campanha

**Files:**
- Create: `src/schemas/whatsapp/whatsapp-campaign-schemas.ts`
- Test: `src/schemas/whatsapp/__tests__/whatsapp-campaign-schemas.test.ts`

**What to do:**
- Criar schemas para criar, editar, aprovar, agendar, disparar, cancelar e listar campanhas.
- Criar schemas para preview de audiencia e importacao.
- Cobrir payloads de filtros, grupos de envio e destinatarios importados.

**Verification:**
- Rodar os testes do schema cobrindo payload valido e invalido.

**Depends on:** T1

---

## Fase 2: Core de Negocio

### T3: Criar servico principal de campanha

**Files:**
- Create: `src/services/whatsapp/whatsapp-campaign.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign.service.test.ts`

**What to do:**
- Implementar criacao de rascunho, atualizacao, submissao para aprovacao, aprovacao, cancelamento e leitura de estado.
- Garantir que envio imediato ou agendado so possa ocorrer quando a campanha estiver aprovada.
- Registrar autor, aprovador e timestamps relevantes.

**Verification:**
- Testar transicoes de estado felizes e invalidas.

**Depends on:** T2

---

### T4: Criar servico de audiencia e elegibilidade

**Files:**
- Create: `src/services/whatsapp/whatsapp-campaign-audience.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-audience.service.test.ts`

**What to do:**
- Montar audiencia a partir de CRM e importacao.
- Normalizar telefone, deduplicar por campanha e classificar elegibilidade.
- Aplicar bloqueio de opt-out para marketing e registrar motivo de exclusao.

**Verification:**
- Testar dedupe, inelegibilidade e mistura CRM + importacao.

**Depends on:** T2

---

### T5: Criar servico de execucao em lotes

**Files:**
- Create: `src/services/whatsapp/whatsapp-campaign-execution.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-execution.service.test.ts`

**What to do:**
- Processar grupos de envio por instancia escolhida manualmente.
- Enviar destinatarios em lotes usando templates aprovados e o servico ja existente da Meta.
- Persistir status por destinatario, erro de envio, horario de envio e identificador retornado pela Meta.

**Verification:**
- Testar campanha com sucesso parcial, falha parcial e conclusao completa.

**Depends on:** T3, T4

---

### T6: Criar servico de consulta e resumo operacional

**Files:**
- Create: `src/services/whatsapp/whatsapp-campaign-query.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-query.service.test.ts`

**What to do:**
- Implementar listagem, detalhe, contadores por status e resumo por grupo de envio.
- Expor numero de elegiveis, excluidos, enviados, falhados e respondidos.
- Preparar leitura para listagem de dashboard e pagina de detalhe.

**Verification:**
- Testar pagina de listagem e detalhe com dados agregados consistentes.

**Depends on:** T1

---

## Fase 3: API e Execucao Assincrona

### T7: Criar rotas de CRUD e preview de audiencia

**Files:**
- Create: `src/app/api/v1/whatsapp/campaigns/route.ts`
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/route.ts`
- Create: `src/app/api/v1/whatsapp/campaigns/preview/route.ts`

**What to do:**
- Implementar rotas thin para criar, listar, detalhar, atualizar e gerar preview de audiencia.
- Validar payload com schema Zod.
- Delegar toda regra para os servicos do dominio.

**Verification:**
- Testar respostas 200, 400, 404 e 403 nos fluxos esperados.

**Depends on:** T3, T4, T6

---

### T8: Criar rotas de workflow operacional

**Files:**
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/approve/route.ts`
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/dispatch/route.ts`
- Create: `src/app/api/v1/whatsapp/campaigns/[campaignId]/cancel/route.ts`

**What to do:**
- Implementar aprovacao, disparo imediato, agendamento e cancelamento.
- Garantir que o mesmo criador possa autoaprovar na v1.
- Validar pre-condicoes antes de mover a campanha para o proximo estado.

**Verification:**
- Testar campanha sem aprovacao, autoaprovacao e cancelamento em estado permitido.

**Depends on:** T3, T5

---

### T9: Criar cron dedicado para campanhas

**Files:**
- Create: `src/app/api/v1/cron/whatsapp/campaign-dispatch/route.ts`
- Modify: `src/lib/db/queue.ts`
- Test: `src/server/cron/__tests__/cron-auth.test.ts`

**What to do:**
- Adicionar um job de campanha ao `JobTracker`.
- Implementar endpoint de cron que busque campanhas agendadas e lotes pendentes.
- Garantir lock distribuido para evitar execucao duplicada.

**Verification:**
- Validar que duas execucoes concorrentes nao processam a mesma campanha ao mesmo tempo.

**Depends on:** T5

---

### T10: Integrar atribuicao de resposta no webhook

**Files:**
- Modify: `src/services/whatsapp/whatsapp-webhook.service.ts`
- Modify: `src/services/whatsapp/whatsapp-chat.service.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-response-attribution.test.ts`

**What to do:**
- Correlacionar resposta inbound com destinatario de campanha quando houver identificadores ou match confiavel.
- Marcar a campanha e o destinatario como respondidos.
- Criar ou vincular lead somente quando necessario para manter o fluxo de chat.

**Verification:**
- Testar resposta de lead ja existente e resposta de contato importado sem lead previo.

**Depends on:** T5

---

## Fase 4: UI de Dashboard

### T11: Criar pagina de listagem de campanhas

**Files:**
- Create: `src/app/dashboard/whatsapp/campaigns/page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaigns-page.tsx`

**What to do:**
- Exibir campanhas com status, projeto, tipo, agendamento e totais principais.
- Permitir filtros rapidos por projeto, status e tipo de campanha.
- Manter o primeiro render server-first.

**Verification:**
- Validar listagem com campanhas vazias, ativas e concluidas.

**Depends on:** T6

---

### T12: Criar builder de campanha

**Files:**
- Create: `src/app/dashboard/whatsapp/campaigns/new/page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-builder.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/audience-preview.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/import-audience-form.tsx`

**What to do:**
- Implementar fluxo de criacao com dados basicos, tipo, template, grupos de envio, filtros e importacao.
- Exibir preview de elegiveis e inelegiveis antes da aprovacao.
- Permitir escolher envio imediato ou agendado.

**Verification:**
- Validar criacao de campanha por CRM, por importacao e mista.

**Depends on:** T7, T8

---

### T13: Criar pagina de detalhe e acompanhamento

**Files:**
- Create: `src/app/dashboard/whatsapp/campaigns/[campaignId]/page.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-detail.tsx`
- Create: `src/components/dashboard/whatsapp/campaigns/campaign-recipient-table.tsx`

**What to do:**
- Exibir timeline da campanha, aprovacao, grupos de envio, progresso e tabela de destinatarios.
- Mostrar motivos de exclusao, erros de envio e respostas recebidas.
- Destacar claramente o que foi enviado, falhou, foi excluido e respondeu.

**Verification:**
- Validar detalhe para campanha em rascunho, agendada, em execucao e concluida.

**Depends on:** T6, T10

---

## Fase 5: Validacao e Fechamento

### T14: Validar fluxos de ponta a ponta

**Files:**
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign.service.test.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-audience.service.test.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-execution.service.test.ts`
- Test: `src/services/whatsapp/__tests__/whatsapp-campaign-response-attribution.test.ts`

**What to do:**
- Executar testes de schema, servico, cron e atribuicao.
- Rodar build do projeto.
- Validar manualmente: criar rascunho, aprovar, agendar, disparar, receber resposta e conferir atribuicao.

**Verification:**
- `npm test`
- `npm run build`
- fluxo manual completo em ambiente de desenvolvimento

**Depends on:** T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13
