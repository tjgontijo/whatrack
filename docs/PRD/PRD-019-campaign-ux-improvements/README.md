# PRD-019: Campaign UX Improvements

**Status:** Draft
**Data:** 2026-03-25
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD consolida as melhorias de UX e funcionalidades incrementais do modulo de campanhas WhatsApp.
O objetivo e eliminar os gaps mais visíveis da experiência atual: navegação por drawer, falta de funil
de engajamento, ausência de filtros na tabela de destinatários, ausência de preview de template,
impossibilidade de duplicar campanhas, e ausência de gestão de opt-outs.

A decisao estratégica central deste PRD: **abandonar o drawer de criação de campanha e usar o
Campaign Builder em tela cheia** (`/campaigns/new`) como único ponto de entrada para novas campanhas.

---

## Estrutura do PRD

```
PRD-019-campaign-ux-improvements/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Remover `CampaignFormDrawer` e redirecionar criação para `/campaigns/new`.
- Adicionar funil de engajamento SENT → DELIVERED → READ → RESPONDED na página de detalhe.
- Adicionar filtro por status e busca por telefone na tabela de destinatários.
- Adicionar preview de template no passo de Conteúdo do Campaign Builder.
- Implementar ação de duplicar campanha (API + UI).
- Implementar gestão de blocklist/opt-out com exclusão automática no snapshot.

### Status Atual

- `CampaignBuilder` existe em `/campaigns/new` mas o botão "Nova campanha" ainda abre drawer.
- `/stats` retorna apenas `total/success/failed/pending` — sem breakdown por status.
- Tabela de destinatários tem paginação mas sem filtro ou busca.
- Não existe preview de template no wizard.
- Não existe ação de duplicar campanha.
- Não existe modelo nem UI de opt-out/blocklist.

### Escopo

**Entra:**

- Migração drawer → main shell (Task 1)
- Funil de engajamento no `/stats` + componente visual (Tasks 2-3)
- Filtro e busca na tabela de destinatários (Tasks 4-5)
- Preview de template no Campaign Builder (Task 6)
- Duplicar campanha — API + botão (Tasks 7-8)
- Blocklist/opt-out — schema, service, API, UI, exclusão automática (Tasks 9-13)

**Fica fora:**

- Revenue Attribution (PRD futuro)
- Pause/Resume durante execução (PRD futuro)
- Throttle configurável (PRD futuro)
- Cadência/Drip (PRD-022)

### Estimativa

- 2 fases: Quick Wins (Tasks 1-8) + Blocklist (Tasks 9-13)

---

## Arquivos/Areas Principais

- `src/components/dashboard/campaigns/campaigns-page.tsx` — remover drawer, botão navega para /new
- `src/components/dashboard/campaigns/campaign-form-drawer.tsx` — deletar
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/stats/route.ts` — adicionar breakdown por status
- `src/app/(dashboard)/.../campaigns/[campaignId]/page.tsx` — funil visual + filtro recipients
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/recipients/route.ts` — query params de filtro
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/duplicate/route.ts` — novo endpoint
- `src/components/dashboard/campaigns/builder/campaign-builder.tsx` — step de preview
- `prisma/schema.prisma` — modelo `WhatsAppOptOut`
- `src/lib/whatsapp/services/whatsapp-opt-out.service.ts` — CRUD + exclusão no snapshot
- `src/app/api/v1/whatsapp/opt-outs/route.ts` — endpoints de opt-out
- `src/components/dashboard/campaigns/opt-out-manager.tsx` — UI de blocklist

---

## Dependencias

**Pre-requisitos:** PRD-017 completo e mergeado (já está).

Nenhuma dependência externa de outros PRDs em andamento.

---

## Como Ler Este PRD

1. `CONTEXT.md` — definições, fluxo e regras de negócio
2. `DIAGNOSTIC.md` — decisões técnicas e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execução

---

## Proximo Passo

Iniciar pela Task 1 (drawer → main shell) pois é o desbloqueio para todas as outras melhorias de UX
que dependem do Campaign Builder em tela cheia.
