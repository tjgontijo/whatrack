# PRD-013: AI Studio Platform

**Status:** Draft
**Data:** 2026-03-21
**Versao:** 1.0

---

## O Que E Este PRD?

Este PRD cobre a segunda etapa da migracao: transformar o runtime de IA entregue no PRD-012 em uma plataforma operavel pelo time via AI Studio.

Ele nao reimplementa o core runtime. Ele assume que o PRD-012 ja entregou o caminho estavel de producao para inbound no WhatsApp.

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

Entregar a camada de governanca e operacao do novo sistema de IA:

- catalogo de blueprints
- gerenciamento de skills e versoes
- policies via UI
- execution logs exploraveis
- migracao do Meta Ads Audit para a nova arquitetura
- evolucao da UI minima para um AI Studio completo

### Status Atual

- o runtime V1 deve existir no PRD-012
- nao existe operacao segura de skills/versoes via UI

### Escopo - O Que Entra

- AI Studio project-scoped
- listagem e ativacao de blueprints
- listagem, detalhe e publicacao de skills
- versionamento de skill via UI
- CRUD de policies
- execution logs completos
- Meta Ads Audit como skill
- evolucao da UI minima entregue no PRD-012 para um studio completo

### Escopo - O Que Fica Fora

- multiplos blueprints simultaneos por projeto
- experimentacao A/B
- automacoes proativas complexas fora do inbound
- analytics de performance de produto para o agente

### Estimativa

4 fases, iniciadas apenas depois da estabilizacao do PRD-012.

---

## Arquivos/Areas Principais

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/`
- `src/components/dashboard/ai/`
- `src/app/api/v1/ai/`
- `src/services/ai/`
- `src/app/api/v1/meta-ads/audit/route.ts`

---

## Dependencias

Este PRD depende do PRD-011 e do PRD-012 concluidos.

Este PRD depende diretamente de:

- modelos de runtime do PRD-012
- execution logs do PRD-012
- config minima do projeto entregue no PRD-012
- contractos de `AiSkill`, `AiSkillVersion` e `AiBlueprintActivation`

Sem isso, o AI Studio vira mais uma UI sobre modelo instavel.

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Fechar o PRD-012 e usar este PRD como backlog da fase seguinte.
