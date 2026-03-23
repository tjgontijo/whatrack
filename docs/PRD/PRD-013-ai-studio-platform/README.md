# PRD-013: AI Studio Platform

**Status:** Draft (Reescrito em 2026-03-23)
**Versao:** 2.0

---

## O Que E Este PRD?

Este PRD transforma o runtime de IA entregue pelo PRD-012 em uma plataforma operavel pelo time via AI Studio. Ele nao reimplementa o core runtime. Ele constroi a camada de governanca, configuracao e observabilidade que permite operar o agente sem tocar no banco de dados ou no codigo.

---

## Estrutura Do PRD

```text
PRD-013-ai-studio-platform/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
└── QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Wizard de configuracao de agente: o usuario responde perguntas sobre o negocio e o sistema seleciona o blueprint certo.
- Gestao de skills: listar, editar, versionar e publicar skills via UI.
- Policies via UI: CRUD de crisis keywords e regras de terminologia.
- Timeline de AiEvent: exibir todas as acoes do agente no inbox, ao lado das mensagens.
- Execution logs exploraveis: dashboard para investigar execucoes, erros e custos.
- Migracao do Meta Ads Audit para arquitetura de skills.

### Status Atual

- Runtime V1 entregue pelo PRD-012 com UI minima.
- Sem editor de skills ou publicacao via UI.
- Sem wizard de configuracao.
- Sem policies via UI.

### Escopo - O Que Entra

- Wizard de configuracao do agente (substitui o formulario bruto de config)
- Listagem e ativacao de blueprints com explicacao de cada um
- Listagem, detalhe, edicao e publicacao de skills
- Versionamento de skill com diff de prompt
- CRUD de crisis keywords
- CRUD de regras de terminologia (TerminologyRule — novo modelo)
- Dashboard de execution logs com filtros e drilldown
- Timeline de AiEvent no inbox do ticket
- Migracao do Meta Ads Audit para skill do runtime

### Escopo - O Que Fica Fora

- Multiplos blueprints ativos simultaneamente por projeto
- Experimentacao A/B de skills
- Criacao de blueprints customizados pelo usuario
- Analytics de performance do agente em nivel de produto
- Cadencias (PRD-022)

### Estimativa

4 fases, iniciadas apenas depois do PRD-012 estabilizado em producao.

---

## Arquivos/Areas Principais

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/`
- `src/components/dashboard/ai/`
- `src/app/api/v1/ai/`
- `src/services/ai/`
- `src/app/api/v1/meta-ads/audit/route.ts`

---

## Dependencias

**Pre-requisitos obrigatorios (em ordem):**

1. PRD-011: Remocao da implementacao legada de IA
2. PRD-018: AI Foundation Layer (`LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, `AiEventService`)
3. PRD-012: Core Runtime WhatsApp AI (`AiProjectConfig`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`, `AiCrisisKeyword`, runtime inbound estavel)

---

## Como Ler Este PRD

1. `CONTEXT.md` — definicoes, fluxo e dados
2. `DIAGNOSTIC.md` — decisoes e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execucao

---

## Proximo Passo

Concluir PRD-012 em producao, entao iniciar o AI Studio pela Fase 1 (services e APIs).
