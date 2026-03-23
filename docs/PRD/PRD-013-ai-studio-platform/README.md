# PRD-013: AI Studio Platform

**Status:** Draft (Revisado em 2026-03-23)
**Versao:** 2.2

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
- Gestao de skills: listar, editar, versionar e publicar skills via UI sem alterar as skills globais de sistema.
- Policies via UI: CRUD de crisis keywords e regras de terminologia.
- Timeline de `AiEvent`: exibir as acoes do agente no inbox, ao lado das mensagens.
- Execution logs exploraveis: dashboard para investigar execucoes, erros e custos.
- RBAC do studio: introduzir `view:ai` para leitura e manter `manage:ai` para mutacoes.
- Frontend aderente ao padrao do dashboard: `HeaderPageShell` + `HeaderTabs`, sem navegacao lateral nova e sem shell paralelo.

### Status Atual

- PRD-018 entregou a fundacao (`AiEvent`, `LeadAiContext`, `AiAgent`, `AiAgentProjectConfig`).
- PRD-012 entregou o runtime inbound e a configuracao minima por projeto via API.
- Ainda nao existe AI Studio em `settings/ai-studio`.
- Ainda nao existe timeline de IA no inbox.
- Ainda nao existe modo read-only com permissao `view:ai`.

### Escopo - O Que Entra

- Wizard de configuracao do agente sobre `AiProjectConfig.blueprintSlug`
- Listagem de blueprints com descricao amigavel
- Listagem, detalhe, edicao e publicacao de skills
- Estrategia de override por projeto para nao editar skill global de sistema
- CRUD de crisis keywords
- CRUD de regras de terminologia (`TerminologyRule`)
- Dashboard de execution logs com filtros e drilldown
- Timeline de `AiEvent` no inbox do ticket
- Reintroducao explicita de `view:ai` no RBAC
- AI Studio como hub de settings usando componentes ja existentes do projeto

### Escopo - O Que Fica Fora

- Multiplos blueprints ativos simultaneamente por projeto
- Experimentacao A/B de skills
- Criacao de blueprints customizados pelo usuario
- Analytics de performance do agente em nivel de produto
- Cadencias (PRD-022)
- Migracao de consumidores externos de IA sem superficie ativa no repo atual (ex: um futuro audit dedicado)
- Navegacao lateral nova, shell novo ou linguagem visual paralela ao dashboard atual

### Estimativa

4 fases, iniciadas apenas depois do PRD-012 estabilizado em producao.

---

## Arquivos/Areas Principais

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/`
- `src/components/dashboard/ai/`
- `src/app/api/v1/ai/`
- `src/lib/ai/services/`
- `src/lib/ai/queries/`
- `src/lib/ai/schemas/`
- `src/lib/auth/rbac/`
- `src/server/organization/`
- `src/components/dashboard/layout/`
- `src/components/dashboard/settings/`

---

## Dependencias

**Pre-requisitos obrigatorios (em ordem):**

1. PRD-018: AI Foundation Layer (`LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, `AiEventService`)
2. PRD-012: Core Runtime WhatsApp AI (`AiProjectConfig`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`, `AiCrisisKeyword`, runtime inbound estavel)

**Referencia historica:**

- PRD-011 pode ser consultado apenas como contexto de cleanup legado. Ele nao bloqueia este PRD.

---

## Como Ler Este PRD

1. `CONTEXT.md` — definicoes, fluxo e dados
2. `DIAGNOSTIC.md` — decisoes e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execucao

---

## Proximo Passo

Fechar o smoke test do PRD-012 e iniciar o AI Studio pela Fase 1: schema, services, queries, APIs e RBAC.
