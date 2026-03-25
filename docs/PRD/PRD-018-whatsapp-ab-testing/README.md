# PRD-018: WhatsApp Campaign A/B Testing

**Status:** Draft
**Data:** 2026-03-25
**Versao:** 1.0
**Depende de:** PRD-017 (WhatsApp Campaign Audience Builder)

---

## O Que e Este PRD?

Este PRD define testes A/B nativos para campanhas WhatsApp. O usuario cria uma campanha com N variacoes de template, o sistema divide a audiencia entre elas no momento do envio, rastreia metricas por variante e pode promover automaticamente o vencedor para o restante da audiencia.

A feature usa diretamente a fundacao do PRD-017: `dispatchGroups` multiplos, snapshot congelado de destinatarios, builder em pagina cheia. Sem PRD-017 completo este PRD nao e implementavel.

---

## Estrutura do PRD

```
PRD-018-whatsapp-ab-testing/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Criar uma campanha com N variacoes de template (A, B, C...).
- Dividir a audiencia entre variacoes com split configuravel (50/50, 70/30, ou percentual customizado).
- Rastrear metricas por variante: envios, entregas, leituras, respostas.
- Definir criterio de vitoria: taxa de resposta, leitura ou manual.
- Auto-promover vencedor: enviar o restante da audiencia com o template vencedor ao fim da janela de teste.

### Status Atual (pos PRD-017)

- Campanha tem um unico template e um unico `dispatchGroup`.
- `dispatchGroups` ja suporta templates diferentes por grupo, mas sem nocao de "variante" nem split de audiencia.
- Stats retornam agregado da campanha; nao existem metricas por grupo/template.
- Nao existe nocao de "janela de teste" nem "vencedor".

### Escopo

**Entra:**
- Campo `isAbTest` em `WhatsAppCampaign`
- Modelo `WhatsAppCampaignVariant` ligado a `dispatchGroups`
- Split de audiencia configuravel no momento do snapshot
- Metricas por variante na pagina de detalhe
- Janela de teste configuravel (ex: 4h, 12h, 24h)
- Auto-promocao do vencedor (cron que verifica janela expirada + dispara restante)
- Criterio de vitoria: `RESPONSE_RATE | READ_RATE | MANUAL`
- Audit trail via `WhatsAppCampaignEvent` (tipos `AB_WINNER_SELECTED`, `AB_REMAINDER_DISPATCHED`)

**Fica fora:**
- Significancia estatistica / intervalos de confianca
- Mais de 5 variacoes simultaneas (limite dinamico: `floor(audiencia / 100)`, max 5)
- Alteracao de split ou templates apos criacao
- Integracao com ferramentas de analytics externas
- A/B em mensagens livres (apenas templates aprovados pela Meta)

### Estimativa

- 2 a 3 sprints apos PRD-017 concluido.
- 10 tasks (schema + backend + execucao + ui + metricas).

---

## Direcao Escolhida

**Split upfront**: divide a audiencia uma unica vez no momento do envio/agendamento.

Motivos:
- Snapshot imutavel por variante desde o inicio, sem reprocessamento
- Integracao natural com `dispatchGroups` e o fluxo de execucao atual
- Logica de execucao nao muda: cada grupo processa seus recipients de forma independente
- Auto-promocao e um segundo disparo independente com recipients ainda nao enviados

As alternativas consideradas e trade-offs ficam em `DIAGNOSTIC.md`.

---

## Architecture Reference

Este PRD segue os padroes do **nextjs-feature-dev skill**:

- Domain-organized code em `src/lib/whatsapp/`
- Layer separation (queries, actions, services, schemas)
- Server-first components por padrao
- Thin route handlers (10-20 linhas)
- Result<T> pattern para error handling
- Zod validation em todos os limites
- Structured Pino logging no service layer
- Atomic commits por task
- Branch-per-feature workflow

---

## Arquivos/Areas Principais

- `prisma/schema.prisma` — `WhatsAppCampaignVariant`, campo `isAbTest` em `WhatsAppCampaign`, campo `variantId` em `WhatsAppCampaignRecipient`
- `src/lib/whatsapp/services/whatsapp-campaign-ab.service.ts`
- `src/lib/whatsapp/services/whatsapp-campaign-ab-metrics.service.ts`
- `src/lib/whatsapp/schemas/whatsapp-ab-schemas.ts`
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/ab/route.ts`
- `src/app/api/v1/cron/whatsapp/ab-winner-dispatch/route.ts`
- `src/components/dashboard/whatsapp/campaigns/campaign-builder-ab-step.tsx`
- `src/components/dashboard/whatsapp/campaigns/campaign-ab-metrics.tsx`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Implementar apos PRD-017 concluido. A branch deve ser criada a partir de `main` com PRD-017 mergeado.
