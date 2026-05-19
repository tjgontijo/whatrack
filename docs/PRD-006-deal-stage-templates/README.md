# PRD-006: Template Center para Funis de Negociacao

**Status:** Draft → Active Implementation
**Data:** 2026-05-18
**Versao:** 2.0 (Refactor: Status Groups + Meta Event Mapping UI)

---

## 📋 O Que e Este PRD?

Este PRD define a criacao do **Template Center** no WhaTrack. O objetivo e permitir que novos usuarios nao comecem com um funil vazio, mas escolham entre modelos validados por industria (Imobiliaria, SaaS, E-commerce, etc.), inspirados na interface do ClickUp.

**Documento:** Requisitos de produto, interface de galeria e motor de aplicacao de templates.

**Tempo Total:** 3-4 dias

---

## 📂 Estrutura do PRD

```txt
docs/PRD-006-deal-stage-templates/
├── README.md (este arquivo)
├── CONTEXT.md (dominio, categorias e modelos)
├── DIAGNOSTIC.md ( gaps de onboarding e UX)
├── TASKS.md (plano de implementacao)
└── QUICK_START.md (guia rapido)
```

---

## 🎯 Resumo Executivo

### Status Atual

- Atualmente, as fases sao criadas via seed global ou manualmente.
- Nao existe visualizacao previa de modelos antes da criacao (tipo ClickUp).
- Nao existe separacao entre stages ACTIVE vs WON vs LOST (impacta conversao + forecasting).
- Usuario nao consegue definir qual evento Meta CAPI disparar em cada fase.

### O Que Muda (V2.0)

✅ **3-Group UI (tipo ClickUp):** ACTIVE | WON | LOST com visual claro
✅ **Status Semanticamente Correto:** Stages progridem em ACTIVE, WON/LOST sao finais
✅ **Meta Event Mapping:** Usuario escolhe qual evento Meta disparar por stage (UI para escolher)
✅ **Probability Forecasting:** Cada stage tem % de conversao esperada
⏳ **Envio Real de Evento:** Implementado em T5 (fora do escopo agora)

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 1 (Status Groups) | 🟡 2 | 🟢 1    |

### Ordem de Implementacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Schema & Seed | T1, T2 | 1d |
| 2: Galeria UI (ClickUp Style) | T3 | 1.5d |
| 3: Modal + Event Mapping UI | T4 | 1d |
| 4: Refinamento | T5 | 0.5d |

**Total:** ~4 dias de desenvolvimento.

---

## 🔴 Problemas Criticos

### T1: Schema com Status Groups + Meta Event Mapping

**Impacto:** 
- Sem status groups, funil permanece linear e nao suporta conversao/forecasting corretamente.
- Sem Meta event mapping, usuario nao consegue definir qual evento CAPI disparar.
- Dados de conversao contamina (WON/LOST misturado com ACTIVE).

**Solucao:** 
- Expandir `DealStageTemplateItem` com `statusGroup`, `probability`, `suggestedMetaEventName`
- Criar `DealStageMetaEventMapping` para rastrear escolhas do usuario por stage
- Migration: npx prisma migrate dev --name add_status_groups_meta_events

---

## 🟡 Problemas Moderados

### T3: Galeria de Templates (ClickUp Style UI)

**Impacto:** 
- Interface atual é árida (lista simples de fases).
- Usuario nao visualiza o fluxo completo antes de aplicar.
- Falta clareza sobre WON vs LOST vs ACTIVE stages.

**Solucao:** 
- Grid responsiva com sidebar de categorias (tipo ClickUp).
- Card preview mostrando 3-group layout visual (ACTIVE | WON | LOST).
- Chevrons/blocos horizontais para representar progresso do funil.

### T4: Modal Detalhado + Event Mapping UI

**Impacto:** 
- Usuario nao consegue customizar qual evento Meta disparar em cada stage.
- Aplicacao é "tudo ou nada" - sem opcoes de personalizacao.

**Solucao:**
- Modal com expansão de cada stage mostrando:
  - Nome, cor, probability (editavel)
  - Dropdown para "Evento Meta sugerido" (Lead, Purchase, ViewContent, Schedule, etc.)
  - Checkboxes para "Incluir email?", "Incluir telefone?", etc.
- Botao "Aplicar Template" com confirmacao de safety.

---

## 💾 Arquivos Principais

- `prisma/schema.prisma` - Novos modelos de Template.
- `src/app/api/v1/deal-stage-templates/route.ts` - API de listagem e aplicacao.
- `src/features/dashboard/components/pipeline/template-center/` - Novos componentes UI.
- `src/lib/constants/funnel-templates.ts` - Definicao estatica dos modelos iniciais.

---

## ✅ Como Comecar

1. Ler: CONTEXT.md para entender as categorias de industria.
2. Criar branch: `git checkout -b feature/funnel-template-center`
3. Iniciar pelo Schema (T1).

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 (Schema + Status Groups) | Alto | Baixa | BAIXO | 3h |
| T2 (Seed com 5 templates) | Medio | Baixa | BAIXO | 2h |
| T3 (Galeria Grid ClickUp) | Medio | Alta | MEDIO | 8h |
| T4 (Modal + Event Mapping) | Medio | Media | MEDIO | 6h |
| T5 (Onboarding) | Baixo | Media | BAIXO | 2h |

---

**Status:** Aguardando validacao do rascunho.