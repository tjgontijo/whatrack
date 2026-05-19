# Tasks: PRD-010 Executive Dashboard KPIs Implementation

**Data:** 2026-05-19 | **Status:** Revisado | **Total Tasks:** 14 | **Estimado:** 24-34h

---

## 🔴 Fase 1: Modelo Analitico e Verdade dos Dados (11-15h)

### T1: Adicionar models analiticos no Prisma (3-4h)

**Problema:** nao existe camada local para Meta Insights nem read models do dashboard.

**Localizacao:**

- `prisma/schema.prisma`
- nova migration Prisma

**O que fazer:**

1. Adicionar `OrganizationAnalyticsSettings`.
2. Adicionar `MetaInsightSyncRun`.
3. Adicionar `MetaAdInsightDaily`.
4. Adicionar `CurrencyExchangeRateDaily`.
5. Adicionar `DashboardMetricRefreshRun`.
6. Adicionar `DashboardDailyMetric`.
7. Adicionar `DashboardOriginDailyMetric`.
8. Adicionar `DashboardMetaEntityDailyMetric`.
9. Criar indices por `organizationId`, `projectId`, `date`, `level`, `entityKey`.
10. Usar `@default(dbgenerated("gen_random_uuid()"))`, sem gerar UUID no codigo.

**Aceitacao:**

- [ ] Migration Prisma criada.
- [ ] `prisma generate` passa.
- [ ] Models usam `@@map` consistente.
- [ ] `MetaAdInsightDaily` usa `entityKey` para evitar unique com null.
- [ ] Todas as read models possuem `organizationId`, `projectId` e `date`.

**Como testar:**

```bash
npm run build
npm test:prisma
```

**Tempo:** 3-4h

---

### T2: Implementar sync local de Meta Ads Insights (3-4h)

**Problema:** dashboard nao pode buscar spend diretamente da Meta durante renderizacao.

**Localizacao:**

- `src/features/meta-ads/services`
- `src/server/workers`
- `src/server/queues` se necessario
- `src/app/api/v1/meta-ads/*` apenas se houver trigger manual

**O que fazer:**

1. Criar service `sync-meta-insights.service.ts`.
2. Buscar insights por conta ativa, periodo e niveis `account`, `campaign`, `adset`, `ad`.
3. Normalizar data, timezone, moeda e `entityKey`.
4. Upsert em `MetaAdInsightDaily`.
5. Registrar cada execucao em `MetaInsightSyncRun`.
6. Rodar por cron/worker, nunca no render da pagina.
7. Sincronizar ultimos 7 dias com maior frequencia e janelas antigas com menor frequencia.

**Aceitacao:**

- [ ] Dashboard nao chama Meta API diretamente.
- [ ] Sync grava linhas em `MetaAdInsightDaily`.
- [ ] Falha por uma conta nao interrompe outras contas.
- [ ] `MetaInsightSyncRun` registra status, erro e rows fetched.
- [ ] Sync e idempotente para mesma data e entidade.

**Como testar:**

```bash
npm test -- src/features/meta-ads
```

**Tempo:** 3-4h

---

### T3: Implementar projectors das read models (3-4h)

**Problema:** agregacoes em tabelas operacionais nao devem rodar no hot path do dashboard.

**Localizacao:**

- `src/features/dashboard/projectors`
- `src/features/dashboard/repositories`
- `src/server/workers`

**O que fazer:**

1. Criar projector diario por organizacao/projeto/data.
2. Recalcular metricas a partir de:
   - `Lead`
   - `Deal`
   - `DealTracking`
   - `DealStage`
   - `Sale`
   - `Conversation`
   - `Message`
   - `MetaConversionEvent`
   - `MetaAdInsightDaily`
3. Upsert em:
   - `DashboardDailyMetric`
   - `DashboardOriginDailyMetric`
   - `DashboardMetaEntityDailyMetric`
4. Registrar execucao em `DashboardMetricRefreshRun`.
5. Rodar refresh incremental para o dia atual apos mutacoes relevantes.
6. Rodar backfill dos ultimos N dias por cron ou comando.

**Aceitacao:**

- [ ] Projector e idempotente.
- [ ] Reprocessar a mesma data nao duplica metricas.
- [ ] Read models batem com dados operacionais em fixtures.
- [ ] Projector nao acessa dados de outra organizacao.
- [ ] `DashboardMetricRefreshRun` registra sucesso/falha.

**Tempo:** 3-4h

---

### T4: Definir atribuicao, timezone e moeda como regra de negocio (1-2h)

**Problema:** ROAS e CAC ficam inconsistentes sem regras rigidas.

**Localizacao:**

- `src/features/dashboard/services`
- `src/features/dashboard/projectors`
- `src/features/dashboard/schemas`
- `src/features/meta-ads/services`

**O que fazer:**

1. Implementar helper de classificacao:
   - `META_PAID`
   - `OTHER_PAID`
   - `ORGANIC`
   - `UNKNOWN`
2. ROAS Meta usa somente `META_PAID`.
3. Periodos usam `OrganizationAnalyticsSettings.timezone`.
4. Moeda base usa `OrganizationAnalyticsSettings.baseCurrency`.
5. Se moeda Meta nao puder ser convertida, ratios financeiros ficam indisponiveis com motivo explicito.

**Aceitacao:**

- [ ] `ctwaclid`, `metaAdId`, `metaCampaignId` classificam como Meta paid.
- [ ] `gclid` nao entra em ROAS Meta.
- [ ] `fbclid` sozinho nao entra em ROAS Meta sem outra evidencia Meta forte.
- [ ] Periodo `today` respeita timezone da organizacao.
- [ ] Cross-currency sem cambio nao calcula ROAS/CAC.

**Tempo:** 1-2h

---

### T5: Corrigir semantica de receita realizada, pendente e pipeline (1h)

**Problema:** usar apenas uma receita mistura caixa realizado, venda pendente e potencial.

**Localizacao:**

- `src/features/meta-ads/services/ad-insights.service.ts`
- `src/features/dashboard/services`
- `src/features/dashboard/projectors`

**O que fazer:**

1. Trocar `status = paid` por `completed`.
2. Separar:
   - receita realizada: `Sale.status = completed`;
   - receita pendente: `Sale.status = pending`;
   - pipeline aberto: `Deal.status = open`;
   - forecast ponderado: `Deal.dealValue * DealStage.probability`.
3. Garantir que ROAS usa receita realizada, nao pending.

**Aceitacao:**

- [ ] Nenhuma query financeira usa `Sale.status = paid`.
- [ ] Receita realizada usa apenas `completed`.
- [ ] Receita pendente aparece separada.
- [ ] Pipeline aberto aparece separado.
- [ ] ROAS nao usa receita pendente.

**Tempo:** 1h

---

### T6: Substituir cards falsos por scorecard executivo (1h)

**Problema:** cards atuais exibem agendamento e comparecimento sem base atual.

**Localizacao:**

- `src/features/dashboard/schemas/dashboard-summary.ts`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page-client.tsx`
- futura screen server-side do dashboard

**O que fazer:**

1. Remover `Agendamentos`.
2. Remover `Comparecimentos`.
3. Criar scorecard:
   - receita realizada;
   - receita pendente;
   - pipeline aberto ou forecast ponderado;
   - investimento Meta;
   - ROAS;
   - CAC;
   - CPL;
   - leads;
   - vendas;
   - conversao;
   - SLA P50/P90;
   - leads aguardando resposta.

**Aceitacao:**

- [ ] Cards falsos nao aparecem.
- [ ] Cards leem read models, nao API Meta.
- [ ] Ratios usam null-safe formulas.
- [ ] Freshness de Meta aparece quando houver spend.

**Tempo:** 1h

---

## 🟡 Fase 2: Dashboard Rapido e Robusto (9-13h)

### T7: Implementar origens e campanhas via read models (2-3h)

**Problema:** `buildOriginsSummary` e `buildPaidCampaignsSummary` retornam vazio.

**Localizacao:**

- `src/features/dashboard/services/build-origins.ts`
- `src/features/dashboard/services/build-paid-campaigns.ts`
- `src/features/dashboard/repositories`

**O que fazer:**

1. `buildOriginsSummary` deve ler `DashboardOriginDailyMetric`.
2. `buildPaidCampaignsSummary` deve ler `DashboardMetaEntityDailyMetric`.
3. Calcular ROAS, CAC, CPL e conversao no service.
4. Ordenar por receita realizada, spend ou ROAS conforme filtro.

**Aceitacao:**

- [ ] Origens aparecem sem aggregate pesado em tabelas operacionais.
- [ ] Campanhas aparecem sem chamada Meta API.
- [ ] Dados respeitam periodo, org e projeto.
- [ ] Resultado informa `insightSyncedAt` ou freshness equivalente.

**Tempo:** 2-3h

---

### T8: Separar repositories, services, projectors e workers (1-2h)

**Problema:** dashboard nao deve concentrar banco, regra e render em um service.

**Localizacao:**

- `src/features/dashboard/repositories`
- `src/features/dashboard/services`
- `src/features/dashboard/projectors`
- `src/features/dashboard/server.ts`

**O que fazer:**

1. Repositories acessam Prisma com `select`, `aggregate` ou `groupBy` explicito.
2. Services validam e calculam ratios.
3. Projectors materializam dados.
4. Workers executam sync e refresh.
5. `index.ts` nao exporta server-only.

**Aceitacao:**

- [ ] Banco fica fora de componentes e hooks.
- [ ] Services usam `import "server-only"`.
- [ ] Repositories usam `import "server-only"`.
- [ ] Queries independentes usam `Promise.all`.

**Tempo:** 1-2h

---

### T9: Migrar dashboard raiz para Server Components com Suspense (2h)

**Problema:** render inicial client-first atrasa a home.

**Localizacao:**

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page.tsx`
- `src/features/dashboard/screens`
- `src/features/dashboard/components`

**O que fazer:**

1. Transformar `page.tsx` em Server Component real.
2. Usar `await params` e `await searchParams`.
3. Renderizar scorecard e blocos a partir de services server-side.
4. Usar `Suspense` por bloco.
5. Client component apenas para filtros, refresh e controles.

**Aceitacao:**

- [ ] Dados principais renderizam no servidor.
- [ ] Cada bloco tem fallback proprio.
- [ ] Filtros ficam em URL state.
- [ ] Nenhum fetch inicial depende de `useEffect`.

**Tempo:** 2h

---

### T10: Implementar cache seguro e invalidacao (1-2h)

**Problema:** cache multi-tenant precisa ser tratado como risco de seguranca.

**Localizacao:**

- `src/features/dashboard/services`
- rotas de mutacao de `deals`, `sales`, `whatsapp`, `meta-ads`

**O que fazer:**

1. Usar `"use cache"` apenas para leitura local de read models.
2. Cache key deve incluir `organizationId`, `projectId`, periodo e filtros.
3. `cacheTag` deve incluir org/projeto.
4. Invalidar tags apos refresh de read model.
5. Nunca confiar em cache para isolamento, somente em filtros de query.

**Aceitacao:**

- [ ] Teste cross-tenant passa.
- [ ] Toda query tem `organizationId`.
- [ ] Project-scoped query tem `projectId`.
- [ ] Cache nao chama Meta API.

**Tempo:** 1-2h

---

### T11: Criar testes da camada analitica (3-4h)

**Problema:** metricas executivas quebram silenciosamente.

**Localizacao:**

- `src/features/dashboard/**/__tests__`
- `src/features/meta-ads/**/__tests__`

**O que fazer:**

1. Testar formulas.
2. Testar classificacao de trafego.
3. Testar timezone.
4. Testar moeda.
5. Testar projectors idempotentes.
6. Testar isolamento multi-tenant.
7. Testar que `pending` nao entra em ROAS.
8. Testar que Meta API nao e chamada no service de dashboard.

**Aceitacao:**

- [ ] Testes rodam sem API Meta real.
- [ ] Projector reprocessado gera mesmo resultado.
- [ ] Dados de outra org nao aparecem.
- [ ] Ratios financeiros batem com fixtures.

**Tempo:** 3-4h

---

## 🟢 Fase 3: UX, Observabilidade e Docs (4-6h)

### T12: Exibir freshness e fallback de dados (1h)

**Problema:** Meta atrasada nao deve parecer dashboard quebrado.

**O que fazer:**

1. Mostrar `Ultima sincronizacao`.
2. Mostrar badge `Atualizado`, `Desatualizado` ou `Nunca sincronizado`.
3. Se Meta falhar, mostrar ultimo dado local.
4. Se nunca sincronizou, mostrar estado de configuracao.

**Aceitacao:**

- [ ] Falha Meta nao retorna `null` silencioso.
- [ ] Usuario sabe idade dos dados.

**Tempo:** 1h

---

### T13: Adicionar observabilidade operacional (1-2h)

**Problema:** sync e projectors precisam ser auditaveis.

**O que fazer:**

1. Logs estruturados por run.
2. Contadores de rows fetched e rows upserted.
3. Tela ou endpoint de debug, se fizer sentido.
4. Alertas internos para falhas recorrentes, a confirmar.

**Aceitacao:**

- [ ] Cada falha de sync fica registrada.
- [ ] Cada falha de projector fica registrada.
- [ ] Suporte consegue saber se dado esta atrasado.

**Tempo:** 1-2h

---

### T14: Documentar formulas e contratos finais (1h)

**Problema:** KPI sem definicao vira disputa operacional.

**O que fazer:**

1. Documentar formulas finais.
2. Documentar atribuicao Meta.
3. Documentar timezone e moeda.
4. Documentar freshness esperado.
5. Documentar limitacoes V1.

**Aceitacao:**

- [ ] Formulas aparecem no PRD ou doc da feature.
- [ ] Regras de atribuicao nao ficam "a confirmar".
- [ ] Time sabe explicar divergencia com Meta Ads Manager.

**Tempo:** 1h

---

## 📊 Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 | 3-4h | Nenhum |
| T2 | 3-4h | T1 |
| T3 | 3-4h | T1, T2 parcial |
| T4 | 1-2h | T1 |
| T5 | 1h | Nenhum |
| T6 | 1h | T1, T3 |
| T7 | 2-3h | T3 |
| T8 | 1-2h | T1 |
| T9 | 2h | T6, T7 |
| T10 | 1-2h | T9 |
| T11 | 3-4h | T1-T7 |
| T12 | 1h | T2 |
| T13 | 1-2h | T2, T3 |
| T14 | 1h | T4-T7 |

**Total:** 24-34h

---

## ✅ Checklist de Arquitetura

- [ ] Dashboard nao chama Meta API no render.
- [ ] Meta insights ficam em tabela local.
- [ ] Read models alimentam scorecard e tabelas.
- [ ] Projectors sao idempotentes.
- [ ] Timezone e moeda estao modelados.
- [ ] Atribuicao Meta e rigida.
- [ ] `organizationId` em toda query.
- [ ] `projectId` quando houver escopo.
- [ ] Server Components por padrao.
- [ ] Client Components apenas para interacao.
- [ ] Cache apenas em leitura local.
- [ ] Testes cobrem isolamento multi-tenant.

---

**Status:** plano revisado para arquitetura de grande aplicacao
