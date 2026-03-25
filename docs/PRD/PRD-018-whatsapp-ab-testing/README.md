# PRD-018: WhatsApp Campaign A/B Testing

**Status:** Draft
**Data:** 2026-03-25
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD define a implementacao de testes A/B nativo para campanhas WhatsApp. Usuarios podem criar uma campanha com multiplos templates e deixar o sistema dividir automaticamente a audiencia entre as variacoes, com metricas de performance por variante e promocao automatica do vencedor.

A feature repousa completamente na fundacao do PRD-017 (builder em pagina cheia, dispatchGroups multiplos, snapshot congelado de destinatarios). Sem PRD-017 completo, este PRD nao funciona.

---

## Estrutura do PRD

PRD-018-whatsapp-ab-testing/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md

---

## Resumo Executivo

### Objetivo

- Permitir criar uma campanha com N variacoes de template (A, B, C...).
- Dividir a audiencia entre as variacoes (equiprobavel ou percentual customizado).
- Rastrear metricas de performance por variante: envios, entregas, leituras, respostas, taxa de conversao.
- Permitir definir criterio de vitoria: maior taxa de entrega, mais respostas, ou manual.
- Auto-promover o vencedor: enviar o restante da audiencia com o template vencedor.

### Status Atual

- Cada campanha suporta um unico template (ou multiplos via `dispatchGroups`, mas nao com split de audiencia).
- Nao existe nocao de "variacoes de uma mesma campanha".
- Stats exibem agregados, nao por template/variante.

### Escopo

**Entra:**
- Nova UX no builder (etapa "Teste A/B") para criar variacoes
- Split configuravel de audiencia (50/50, 70/30, ou percentual customizado por variante)
- Snapshot de destinatarios com label de variante
- Metricas de performance por variante no detalhe de campanha
- Auto-promocao de vencedor: ao final da janela de teste, enviar restante da audiencia com template vencedor
- Audit trail: evento de campanha para cada decisao de split/winner

**Fica fora:**
- Significancia estatistica: nao calcula intervalo de confianca, so mostra numeros
- Segmentacao dinamica: nao e possivel mudar o split/templates no meio da execucao
- Multi-objetivo: teste pode ter um criterio de vitoria, nao varios simultaneos
- Integracao com ferramentas de analytics externas

### Estimativa

- Ordem de grandeza: 2 a 3 sprints apos PRD-017 estar pronto.
- 9 tasks (schma + backend + ui + metricas)

---

## Direcao Escolhida

Este PRD adota a abordagem **"split upfront"**.

Motivos principais:

- Simplicidade: divide a audiencia uma unica vez no momento do envio/agendamento
- Snapshot imutavel: cada destinatario sabe sua variante desde o inicio, sem reprocessamento
- Integracao natural com PRD-017: reaproveita o modelo de `dispatchGroups`
- Performance: nao precisa de logica condicional durante execucao

As alternativas consideradas ficam documentadas em `DIAGNOSTIC.md`.

---

## Arquivos/Areas Principais

- `prisma/schema.prisma` (DispatchGroup + WhatsAppCampaignVariant)
- `src/app/api/v1/whatsapp/campaigns/[campaignId]/variants/...`
- `src/components/dashboard/whatsapp/campaigns/campaign-builder-ab-step.tsx`
- `src/services/whatsapp/whatsapp-campaign-variant.service.ts`
- `src/services/whatsapp/whatsapp-campaign-metrics.service.ts`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Validar esta direcao como extensao natural do PRD-017 e usar este PRD como base para a branch e execucao incremental.
