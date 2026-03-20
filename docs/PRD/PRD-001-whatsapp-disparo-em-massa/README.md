# PRD-001: WhatsApp Disparo em Massa via API Oficial

**Status:** Draft
**Data:** 2026-03-19
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD define a v1 da feature de disparo em massa via API Oficial do WhatsApp usando as instancias ja conectadas no produto. O objetivo e transformar a integracao atual, que hoje cobre onboarding, templates, envio unitario, inbox e webhook, em um modulo real de campanha com audiencia, aprovacao, agendamento, execucao em lotes e rastreabilidade.

A proposta desta v1 e deliberadamente enxuta no que mais costuma explodir escopo: automacao, analytics pesado, distribuicao automatica entre instancias e regras complexas de governanca. O foco e entregar um Campaign Core MVP que resolva o fluxo principal de ponta a ponta e sirva como base para otimizacoes futuras.

---

## Estrutura do PRD

PRD-001-whatsapp-disparo-em-massa/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md

---

## Resumo Executivo

### Objetivo
- Permitir criar, aprovar, agendar e disparar campanhas em massa usando apenas templates aprovados pela Meta.
- Suportar audiencia vinda de leads do CRM e de listas importadas.
- Garantir pre-validacao, deduplicacao por telefone, bloqueio de opt-out para marketing e tracking por destinatario.

### Status Atual
- O projeto ja possui integracao oficial com a Meta para onboarding, templates, instancias, webhook e envio unitario de template.
- O inbox e o historico de mensagens ja existem e recebem eventos da API oficial.
- Ainda nao existe dominio de campanha, audiencia, aprovacao, agendamento, execucao em lotes ou relatorio por disparo.

### Escopo
- Entra:
- modulo de campanhas com rascunho, aprovacao, envio imediato e agendado
- selecao manual de multiplas instancias no mesmo contexto de campanha
- audiencia por CRM e importacao
- filtros por projeto, tags, estagio, origem e filtros avancados
- deduplicacao por telefone dentro da campanha
- exclusao automatica de contatos inelegiveis com preview de motivos
- bloqueio de opt-out para campanhas de marketing
- atribuicao de resposta recebida para a campanha

- Fica fora:
- distribuicao automatica entre instancias
- mensagem livre fora de templates aprovados
- automacao de follow-up e jornadas
- dashboard analitico avancado
- aprovacao com segregacao obrigatoria entre criador e aprovador
- conversao automatica de contatos importados em lead no momento da importacao

### Estimativa
- Ordem de grandeza: 2 a 3 sprints para uma v1 operacional.
- Otimizacoes posteriores podem ser tratadas em PRDs incrementais sem reabrir o desenho central.

---

## Arquivos/Areas Principais

- `prisma/schema.prisma`
- `src/app/api/v1/whatsapp/campaigns/...`
- `src/app/api/v1/cron/whatsapp/campaign-dispatch/...`
- `src/app/dashboard/whatsapp/campaigns/...`
- `src/components/dashboard/whatsapp/campaigns/...`
- `src/services/whatsapp/...`
- `src/schemas/whatsapp/...`
- `src/server/cron/...`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Validar o escopo da v1, revisar as premissas operacionais e usar este PRD como base para a quebra em execucao incremental.
