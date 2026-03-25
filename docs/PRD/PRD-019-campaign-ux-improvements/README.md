# PRD-019: Campaign UX Improvements

**Status:** Em progresso (Fase 1 completa)
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

- ✅ **Main Shell:** Implementado. A criação foi migrada para `/campaigns/new` e o Drawer removido.
- ✅ **Métricas e Funil:** `/stats` retorna contadores detalhados e o `CampaignEngagementFunnel` exibe o funil na página.
- ✅ **Recipients:** Tabela de destinatários agora possui filtro por status e barra de busca por número de telefone com paginação funcionando.
- ✅ **Preview:** Adicionado preview do template Meta diretamente dentro do Campaign Builder.
- ✅ **Ações:** Implementada duplicação de campanha com 1 clique (endpoint e botão na interface).
- ⬜ **Blocklist / Opt-out:** Ainda não implementado. Não existe modelo nem UI de opt-out/blocklist.

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

Iniciar a **Fase 2 (Blocklist / Opt-out)** abordando a criação do schema `WhatsAppOptOut` e seus relacionamentos no Prisma (Task 9).
