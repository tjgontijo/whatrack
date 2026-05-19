# PRD-010: Executive Dashboard KPIs (Dashboard Executivo de KPIs)

**Status:** Revisado para arquitetura analitica local
**Data:** 2026-05-19
**Versao:** 2.0

---

## 📋 O Que e Este PRD?

Este PRD define a reconstrucao do dashboard raiz como uma tela executiva fiel e performatica. O dashboard deve mostrar KPIs reais de negocio sem depender de chamadas sincronas para a API da Meta e sem fazer agregacoes pesadas nas tabelas operacionais a cada carregamento.

**Documento:** especificacao de produto, modelo de dados analitico, diagnostico tecnico e plano de implementacao para grandes aplicacoes.

**Tempo Total:** 24-34h

---

## 📂 Estrutura do PRD

```txt
PRD-010-executive-dashboard-kpis/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
├── FRONTEND.md    ← spec de UI: layout, componentes, filtros, tabelas, estados
└── QUICK_START.md
```

---

## 🎯 Resumo Executivo

### Status Atual

- O sistema nao tem uma read model de metricas do dashboard.
- O sistema nao tem tabela local de insights diarios da Meta Ads.
- O dashboard atual calcula parte dos dados em tempo real e ainda possui builders vazios.
- `Agendamentos` e `Comparecimentos` aparecem, mas nao existem mais como eventos modelados.
- `ad-insights.service.ts` usa `status = paid`, mas venda valida usa `completed`.
- A pagina raiz e client-first, quando deveria renderizar os dados principais no servidor.

### Decisao de Arquitetura

O dashboard **nao deve chamar a API da Meta durante renderizacao**.

A arquitetura correta fica:

```txt
Meta Ads API
  ↓ BullMQ worker (sync-today: 1h, sync-history: 1x/dia)
MetaAdInsightDaily (syncedAt atualizado)
  ↓ enfileira dashboard-projector.queue
DashboardDailyMetric / DashboardOriginDailyMetric / DashboardMetaEntityDailyMetric
  ↓ revalidateTag ao fim do projector
Server Component (Next.js cache invalidado)
  ↓
Dashboard raiz renderiza com dado local fresco

Hard refresh manual:
POST /api/v1/meta-ads/sync/force
  ↓ priority: 1, jobId deduplicado
  ↓ mesmo fluxo acima, prioritario
```

Infraestrutura BullMQ + Redis **ja existe** no projeto. Novos workers seguem o padrao de `campaign-dispatch.worker.ts`.

Tabelas operacionais continuam como fonte da verdade. Read models existem para velocidade, estabilidade e consistencia de leitura.

**Bug corrigido no modelo:** `DashboardOriginDailyMetric` usa `originKey String` nao-nullable no `@@unique` em vez dos campos UTM diretamente (que sao nullable e causariam duplicatas no Postgres).

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 6 | 🟡 5 | 🟢 3 |

### Ordem de Fixacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Modelo analitico e verdade dos dados | T1-T6 | 11-15h |
| 2: Dashboard rapido e robusto | T7-T11 | 9-13h |
| 3: UX, observabilidade e docs | T12-T14 | 4-6h |

**Total:** 24-34h

---

## 🔴 Problemas Criticos

### T1: Criar models analiticos locais

**Impacto:** sem models analiticos, a home depende de agregacoes caras e API externa.
**Solucao:** adicionar `MetaAdInsightDaily`, `MetaInsightSyncRun`, `DashboardDailyMetric`, `DashboardOriginDailyMetric`, `DashboardMetaEntityDailyMetric`, `DashboardMetricRefreshRun` e configuracoes analiticas.

### T2: Sincronizar Meta Ads em background

**Impacto:** API Meta no hot path deixa a raiz lenta e instavel.
**Solucao:** worker/cron busca insights por dia e grava localmente.

### T3: Criar projectors/read models do dashboard

**Impacto:** agregacoes em `Lead`, `Deal`, `Sale`, `Conversation` e `DealTracking` a cada request nao escalam.
**Solucao:** materializar metricas por dia, origem e entidade Meta.

### T4: Definir regras rigidas de atribuicao, timezone e moeda

**Impacto:** ROAS e CAC ficam inconsistentes se trafego pago, periodo e moeda forem ambiguos.
**Solucao:** padronizar classificacao, timezone da organizacao e conversao de moeda.

### T5: Corrigir semantica de venda e receita

**Impacto:** receita atribuida fica errada se usar status inexistente.
**Solucao:** receita realizada usa `Sale.status = completed`; pipeline e pending aparecem separados.

### T6: Substituir KPIs falsos por scorecard executivo

**Impacto:** cards atuais nao ajudam tomada de decisao.
**Solucao:** usar receita realizada, pipeline, investimento, ROAS, CAC, CPL, leads, vendas, conversao e SLA.

---

## 🟡 Problemas Moderados

### T7: Implementar origens e campanhas a partir das read models

**Impacto:** builders atuais retornam vazio.
**Solucao:** usar read models por origem e entidade Meta, nao API externa.

### T8: Separar repositories, services e projectors

**Impacto:** services grandes e acesso direto ao Prisma dificultam manutencao.
**Solucao:** repositories com `select` explicito, services finos e projectors idempotentes.

### T9: Reestruturar a raiz com Server Components e Suspense

**Impacto:** client-first atrasa a primeira renderizacao.
**Solucao:** renderizar dados locais no servidor e deixar client apenas para filtros/refresh.

### T10: Garantir seguranca multi-tenant no cache e nas queries

**Impacto:** erro de cache ou filtro pode vazar dados entre organizacoes.
**Solucao:** organizationId e projectId obrigatorios em cache key, query e testes.

### T11: Cobrir formulas, projectors e sync com testes

**Impacto:** KPI financeiro quebra silenciosamente.
**Solucao:** testes unitarios e de integracao para formulas, atribuicao, moeda, timezone e isolamento.

---

## 🟢 Problemas Menores

### T12: Estados de freshness e fallback

**Impacto:** se Meta atrasar, usuario precisa saber se dado esta velho, nao ver `null`.
**Solucao:** mostrar `syncedAt`, status do ultimo sync e badge de dado desatualizado.

### T13: Observabilidade do pipeline analitico

**Impacto:** falhas de sync ou projector podem passar despercebidas.
**Solucao:** logs, contadores de linhas, status de run e alertas operacionais.

### T14: Documentar formulas e contratos

**Impacto:** time e usuario podem interpretar KPIs de forma diferente.
**Solucao:** documentar formulas, inclusoes, exclusoes e limites conhecidos.

---

## 💾 Arquivos Principais

- `prisma/schema.prisma` - adicionar os models analiticos e indices.
- `src/features/meta-ads/services` - criar sync de insights locais.
- `src/server/workers` - executar jobs de sincronizacao e projecao.
- `src/features/dashboard/repositories` - ler read models com `select` explicito.
- `src/features/dashboard/services` - orquestrar scorecard e blocos.
- `src/features/dashboard/schemas` - validar filtros e response.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page.tsx` - Server Component da raiz.
- `src/app/api/v1/dashboard/summary/route.ts` - manter API fina ou reduzir uso se a pagina virar server-first.
- `src/features/dashboard/services/build-origins.ts` - substituir implementacao vazia.
- `src/features/dashboard/services/build-paid-campaigns.ts` - substituir implementacao vazia.
- `next.config.ts` - ja possui `cacheComponents: true`.

---

## ✅ Como Comecar

1. Ler `CONTEXT.md` para entender a arquitetura analitica proposta.
2. Ler `DIAGNOSTIC.md` para validar riscos.
3. Executar `TASKS.md` na ordem T1-T14.
4. Comecar pela modelagem Prisma e migracao.
5. So depois ligar UI, porque a tela deve ler dados locais.

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 | Alto | Alta | CRITICO | 3-4h |
| T2 | Alto | Alta | CRITICO | 3-4h |
| T3 | Alto | Alta | CRITICO | 3-4h |
| T4 | Alto | Alta | CRITICO | 1-2h |
| T5 | Alto | Alta | CRITICO | 1h |
| T6 | Alto | Alta | CRITICO | 1h |
| T7 | Medio | Alta | MEDIO | 2-3h |
| T8 | Medio | Media | MEDIO | 1-2h |
| T9 | Medio | Media | MEDIO | 2h |
| T10 | Medio | Alta | MEDIO | 1-2h |
| T11 | Medio | Alta | MEDIO | 3-4h |
| T12 | Baixo | Media | BAIXO | 1h |
| T13 | Baixo | Media | BAIXO | 1-2h |
| T14 | Baixo | Baixa | BAIXO | 1h |

---

**Status:** pacote revisado para execucao correta em escala
