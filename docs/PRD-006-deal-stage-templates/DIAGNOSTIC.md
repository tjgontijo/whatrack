# Diagnostic: Otimizacao do Onboarding via Templates

**Data:** 2026-05-18  
**Status:** Updated para V2.0 (Modal Notion-Style)  
**Escopo:** UX de Configuracao, Retencao de Usuarios, Meta CAPI Event Mapping.

---

## 📋 Resumo Executivo

Atualmente, o WhaTrack exige que o usuario "descubra" como montar um funil. Embora tenhamos fases padrao, elas sao genéricas. Identificamos que a falta de templates especificos por nicho causa paralisia de decisao e configuracao incompleta das automacoes CAPI, que sao o core do valor do produto.

- 🔴 1 Problema Critico de Ativacao.
- 🟡 2 Problemas Moderados de Escalabilidade de Configuracao.

---

## 🔴 Problemas Criticos

### 1. Paralisia de Decisao no Setup Inicial

**Problema:** Novos usuarios chegam sem um processo comercial claro. Criar fases do zero exige esforco cognitivo.

**Impacto:**

- ❌ Usuarios abandonam o setup antes de ver o Kanban funcionar.
- ❌ Funis mal estruturados levam a dados de CRM inuteis.

---

## 🟡 Problemas Moderados

### 2. Subutilizacao do Motor de Eventos CAPI

**Problema:** O usuario comum nao sabe quais eventos Meta (Purchase, Lead, etc.) vincular a quais fases.

**Impacto:**

- ⚠️ O WhaTrack nao entrega o fechamento de loop de ROI prometido no PRD-005.

### 3. Interface "Arida" de Configuracao

**Problema:** A tela atual de edicao de fases e uma lista simples. Falta o aspecto visual de "processo comercial" que a imagem de referencia do ClickUp possui.

**Impacto:**

- ⚠️ Percepcao de valor do software e menor do que a funcionalidade real.

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| Motor de Aplicacao | ✅ | Ja temos services que criam fases em lote (`ensureDealStages`). |
| Flexibilidade | ✅ | O sistema de cores e ordens ja e robusto o suficiente para suportar templates. |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Abandono no Setup | Alto | Alta | CRITICO | 2h (design) |
| Erro na Aplicacao | Medio | Media | MEDIO | 4h (dev) |

---

## 🎯 Proximos Passos

1. Definir o Schema de Templates (T1).
2. Criar a Galeria Visual (T3).
3. Implementar a lógica de "Apply Template" que preserva ou migra deals existentes (T4).
