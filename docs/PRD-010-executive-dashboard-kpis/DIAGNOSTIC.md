# Diagnostic: Dashboard Executivo e Camada Analitica

**Data:** 2026-05-19
**Status:** Revisado para arquitetura correta
**Escopo:** models analiticos, sync Meta Ads, read models, dashboard raiz, KPIs e performance Next.js 16

---

## 📋 Resumo Executivo

O PRD inicial resolvia os cards errados, mas ainda deixava risco estrutural: calcular spend pela API da Meta e fazer agregacoes pesadas no hot path do dashboard. Para uma aplicacao grande, isso nao e aceitavel.

Problemas identificados:

- 🔴 6 Criticos, modelo analitico ausente, dependencia de API externa no dashboard, read models ausentes, atribuicao ambigua, status financeiro incorreto e KPIs falsos.
- 🟡 5 Moderados, arquitetura de camadas, Server Components, cache multi-tenant, testes e observabilidade.
- 🟢 3 Menores, freshness, UX e documentacao.

**Conclusao:** o dashboard deve ser alimentado por fatos locais e read models. A API da Meta deve ser consumida por sync em background. O dashboard deve ler dados locais materializados.

---

## 🔴 Problemas Criticos

### 1. Nao existe model local de Meta Ads Insights

**Problema:** spend, impressões e cliques da Meta existem apenas em chamada externa.

**Impacto:**

- ❌ Dashboard raiz pode levar 5-10s ou falhar.
- ❌ Rate limits da Meta afetam a home.
- ❌ Nao existe historico auditavel do que foi exibido.

**Solucao Necessaria:**

1. Criar `MetaAdInsightDaily`.
2. Criar `MetaInsightSyncRun`.
3. Sincronizar dados em background.
4. Dashboard sempre le dados locais.

---

### 2. Nao existe read model do dashboard

**Problema:** metricas precisam ser agregadas de `Lead`, `Deal`, `Sale`, `Conversation`, `Message`, `DealTracking` e insights Meta em tempo real.

**Impacto:**

- ❌ Custo alto no banco.
- ❌ Latencia cresce com volume.
- ❌ Dashboard vira relatorio pesado, nao home rapida.

**Solucao Necessaria:**

1. Criar `DashboardDailyMetric`.
2. Criar `DashboardOriginDailyMetric`.
3. Criar `DashboardMetaEntityDailyMetric`.
4. Criar `DashboardMetricRefreshRun`.
5. Criar projectors idempotentes.

---

### 3. Atribuicao pago/organico esta ambigua

**Problema:** `sourceType` pode estar ausente ou inconsistente. Click ids diferentes representam canais diferentes.

**Impacto:**

- ❌ ROAS Meta mistura Google, TikTok ou desconhecido.
- ❌ CAC real perde confianca.
- ❌ Usuario nao acredita no dashboard.

**Solucao Necessaria:**

1. Definir `Meta paid`, `Other paid`, `Organic`, `Unknown`.
2. ROAS Meta usa somente evidencias Meta fortes.
3. Projector aplica regra unica e testada.

---

### 4. Timezone e moeda nao estao modelados

**Problema:** periodos do dashboard e Meta Ads podem usar fusos diferentes. Contas Meta podem usar moeda diferente de BRL.

**Impacto:**

- ❌ `Hoje` pode nao bater com Meta Ads Manager.
- ❌ ROAS pode somar USD com BRL.
- ❌ Numeros ficam impossiveis de reconciliar.

**Solucao Necessaria:**

1. Criar `OrganizationAnalyticsSettings`.
2. Criar `CurrencyExchangeRateDaily` ou bloquear ratios cross-currency sem cambio.
3. Normalizar datas para timezone da organizacao.
4. Guardar `currency`, `baseCurrency`, `spendOriginal` e `spendBaseCurrency`.

---

### 5. Receita atribuida usa status inexistente em fluxo Meta

**Problema:** `ad-insights.service.ts` usa `status = paid`, mas `Sale` aceita `pending`, `completed`, `cancelled`.

**Impacto:**

- ❌ Receita atribuida fica zerada ou errada.
- ❌ ROAS fica falso.

**Solucao Necessaria:**

1. Receita realizada usa `completed`.
2. Receita pendente usa `pending` separadamente.
3. Pipeline aberto usa `Deal.dealValue` em deals abertos.

---

### 6. Cards atuais exibem metricas sem base no modelo atual

**Problema:** `Agendamentos` e `Comparecimentos` aparecem, mas retornam zero porque esses modelos foram removidos.

**Impacto:**

- ❌ Dashboard aparenta erro de produto.
- ❌ Usuario perde area nobre com KPI inutil.

**Solucao Necessaria:**

1. Remover cards falsos.
2. Criar scorecard executivo real.
3. Mostrar freshness e status dos dados.

---

## 🟡 Problemas Moderados

### 7. Dashboard client-first

**Problema:** raiz usa client component com TanStack Query para render inicial.

**Impacto:**

- ⚠️ Mais JavaScript.
- ⚠️ First render atrasado.
- ⚠️ Menor uso de PPR e Server Components.

**Solucao Necessaria:**

1. Migrar raiz para Server Component.
2. Usar Suspense por bloco.
3. Manter client apenas para filtros/refresh.

---

### 8. Camadas de dados precisam ser separadas

**Problema:** service atual mistura Prisma, regra de negocio e composicao.

**Impacto:**

- ⚠️ Dificulta testes.
- ⚠️ Dificulta otimizacao.

**Solucao Necessaria:**

1. Repositories para leitura.
2. Services para regra.
3. Projectors para materializacao.
4. Workers para sync e refresh.

---

### 9. Cache multi-tenant pode virar risco se usado errado

**Problema:** `cacheTag` ajuda invalidacao, mas nao e fronteira de seguranca.

**Impacto:**

- ⚠️ Erro em chave ou query pode vazar dados entre organizacoes.

**Solucao Necessaria:**

1. `organizationId` obrigatorio em toda query.
2. `projectId` obrigatorio quando escopo exigir.
3. Cache key derivada dos argumentos.
4. Teste cross-tenant.

---

### 10. Falta observabilidade para sync e projectors

**Problema:** sem run tables e logs, falha analitica fica invisivel.

**Impacto:**

- ⚠️ Dashboard mostra dado antigo sem explicacao.
- ⚠️ Suporte nao sabe se problema e Meta, worker ou projector.

**Solucao Necessaria:**

1. `MetaInsightSyncRun`.
2. `DashboardMetricRefreshRun`.
3. `syncedAt`, `lastProjectedAt` e rows processed.

---

### 11. Testes atuais nao cobrem camada analitica

**Problema:** formulas e projectors podem quebrar silenciosamente.

**Impacto:**

- ⚠️ KPI financeiro errado passa para producao.

**Solucao Necessaria:**

1. Testes de formulas.
2. Testes de atribuicao.
3. Testes timezone/moeda.
4. Testes idempotencia dos projectors.
5. Testes de isolamento multi-tenant.

---

## 🟢 Problemas Menores

### 12. Fallback deve mostrar ultimo dado sincronizado

**Problema:** mostrar `null` quando Meta falha parece bug.

**Solucao Necessaria:**

1. Mostrar ultimo `syncedAt`.
2. Mostrar badge de dado desatualizado.
3. Mostrar CTA de configuracao ou re-sync quando aplicavel.

### 13. UX precisa diferenciar realizado, pendente e forecast

**Problema:** misturar receita realizada com pipeline distorce decisao.

**Solucao Necessaria:**

1. Card de receita realizada.
2. Card de receita pendente.
3. Card de pipeline aberto ou forecast ponderado.

### 14. Documentacao de metricas precisa ser explicita

**Problema:** ROAS, CAC, CPL e SLA podem ser interpretados de varias formas.

**Solucao Necessaria:**

1. Documentar formula.
2. Documentar inclusoes e exclusoes.
3. Documentar atraso esperado dos dados Meta.

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| Tracking operacional existe | ✅ | `DealTracking` guarda UTM, click ids e ids Meta |
| Pipeline Kanban existe | ✅ | `DealStage` e `Deal.stageId` |
| Venda conecta com deal | ✅ | `Sale.dealId` |
| SLA operacional existe | ✅ | `Conversation` e `Deal` guardam tempos |
| Campanha WhatsApp guarda resposta | ✅ | `WhatsAppCampaignRecipient` |
| CAPI tem log | ✅ | `MetaConversionEvent` |
| Next 16 Cache Components ativo | ✅ | `next.config.ts` |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Sem Meta insights local | Alto | Alta | CRITICO | 3-4h |
| Sem read model dashboard | Alto | Alta | CRITICO | 3-4h |
| Atribuicao ambigua | Alto | Alta | CRITICO | 1-2h |
| Timezone/moeda ausentes | Alto | Media | CRITICO | 1-2h |
| Venda `paid` inexistente | Alto | Alta | CRITICO | 1h |
| Cards falsos | Alto | Alta | CRITICO | 1h |
| Client-first | Medio | Media | MEDIO | 2h |
| Camadas misturadas | Medio | Media | MEDIO | 1-2h |
| Cache multi-tenant | Medio | Alta | MEDIO | 1-2h |
| Sem observabilidade | Medio | Media | MEDIO | 1-2h |
| Sem testes analiticos | Medio | Alta | MEDIO | 3-4h |
| Fallback ruim | Baixo | Media | BAIXO | 1h |
| UX de receita incompleta | Baixo | Media | BAIXO | 1h |
| Docs incompletas | Baixo | Baixa | BAIXO | 1h |

---

## 🎯 Ordem de Fixacao

### Fase 1: Modelo analitico e verdade dos dados (11-15h)

1. T1: Models Prisma analiticos.
2. T2: Sync local da Meta.
3. T3: Projectors/read models.
4. T4: Atribuicao, timezone e moeda.
5. T5: Venda completed, pending e pipeline.
6. T6: Scorecard real.

### Fase 2: Dashboard rapido e robusto (9-13h)

7. T7: Origens e campanhas via read models.
8. T8: Repositories, services, projectors e workers.
9. T9: Server Components e Suspense.
10. T10: Cache e seguranca multi-tenant.
11. T11: Testes.

### Fase 3: UX, observabilidade e docs (4-6h)

12. T12: Freshness e fallback.
13. T13: Observabilidade.
14. T14: Documentacao final.

**Total Estimado:** 24-34h

---

**Status:** diagnostico revisado
