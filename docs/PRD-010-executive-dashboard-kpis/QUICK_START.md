# Quick Start: PRD-010 Executive Dashboard KPIs

**TL;DR:** o dashboard correto precisa de camada analitica local. Primeiro criar models de Meta Insights e read models do dashboard, depois ligar a UI. 14 tasks: 6 criticas, 5 moderadas, 3 menores. Total: 24-34h.

---

## 📊 Resumo das Tasks

| # | Problema | Severidade | Fix |
|---|----------|------------|-----|
| T1 | Sem models analiticos | 🔴 Critico | Criar tabelas de insights e read models |
| T2 | Meta API no hot path | 🔴 Critico | Sync background para `MetaAdInsightDaily` |
| T3 | Agregacoes pesadas no dashboard | 🔴 Critico | Projectors para read models |
| T4 | Atribuicao, timezone e moeda ambiguos | 🔴 Critico | Regras e settings analiticos |
| T5 | Receita usa status errado/incompleto | 🔴 Critico | Separar completed, pending e pipeline |
| T6 | Cards falsos | 🔴 Critico | Scorecard executivo real |
| T7 | Origins/campaigns vazios | 🟡 Moderado | Ler read models |
| T8 | Camadas misturadas | 🟡 Moderado | Repositories, services, projectors e workers |
| T9 | Raiz client-first | 🟡 Moderado | Server Components com Suspense |
| T10 | Cache multi-tenant arriscado | 🟡 Moderado | Cache keys com org/projeto e testes |
| T11 | Sem testes analiticos | 🟡 Moderado | Cobrir formulas, projectors e isolamento |
| T12 | Fallback ruim | 🟢 Menor | Freshness e ultimo sync |
| T13 | Sem observabilidade | 🟢 Menor | SyncRun e RefreshRun visiveis |
| T14 | Formulas nao documentadas | 🟢 Menor | Documentar contratos |

---

## 🚀 Ordem Recomendada

```txt
1. T1, adicionar models e migration.
2. T4, fixar regras de atribuicao, timezone e moeda.
3. T2, sync local da Meta.
4. T3, projectors/read models.
5. T5, semantica de receita.
6. T6-T7, scorecard, origens e campanhas.
7. T8-T10, arquitetura Next e cache seguro.
8. T11, testes.
9. T12-T14, freshness, observabilidade e docs.
```

---

## 🔴 Criticos Primeiro

### T1: Models

Adicionar no `prisma/schema.prisma`:

- `OrganizationAnalyticsSettings`
- `MetaInsightSyncRun`
- `MetaAdInsightDaily`
- `CurrencyExchangeRateDaily`
- `DashboardMetricRefreshRun`
- `DashboardDailyMetric`
- `DashboardOriginDailyMetric`
- `DashboardMetaEntityDailyMetric`

**Como testar:**

```bash
npm run build
npm test:prisma
```

### T2: Sync Meta

**Esperado:** worker grava spend local e registra run.

```bash
npm test -- src/features/meta-ads
```

### T3: Projectors

**Esperado:** refresh de uma data atualiza read models sem duplicar.

```bash
npm test -- src/features/dashboard
```

### T4: Regras

**Esperado:** `gclid` nao entra em ROAS Meta; `ctwaclid` entra.

### T5: Receita

**Esperado:** `completed` entra em receita realizada; `pending` entra em receita pendente; nenhum dos dois mistura com pipeline.

### T6: Scorecard

**Esperado:** dashboard nao mostra `Agendamentos` nem `Comparecimentos`.

---

## 📂 Arquivos Principais

- `prisma/schema.prisma` - adicionar camada analitica.
- `src/features/meta-ads/services` - sync local de insights.
- `src/server/workers` - jobs de sync e projection.
- `src/features/dashboard/projectors` - materializacao das read models.
- `src/features/dashboard/repositories` - leitura rapida das read models.
- `src/features/dashboard/services` - formulas e composicao.
- `src/features/dashboard/schemas` - query e response.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page.tsx` - Server Component.
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page-client.tsx` - reduzir para interacao ou remover.

---

## ⚡ Performance Checklist

- [ ] Nenhuma chamada Meta API no render da pagina.
- [ ] Dashboard le apenas tabelas locais.
- [ ] Read models por dia e por dimensao.
- [ ] Sync Meta em worker/cron.
- [ ] Projectors idempotentes.
- [ ] Server Components para render inicial.
- [ ] Suspense por bloco.
- [ ] Cache com org/projeto/filtros.
- [ ] Teste cross-tenant.
- [ ] Freshness visivel para usuario.

---

## 🧪 Validacao Final

```bash
npm run lint
npm test
npm run build
```

Cenarios manuais:

```txt
1. Organizacao sem Meta conectada
   Esperado: scorecard operacional aparece, bloco Meta indica configuracao ausente.

2. Meta API falha
   Esperado: dashboard mostra ultimo dado sincronizado e aviso de atraso.

3. Conta Meta em moeda diferente da base
   Esperado: ratios financeiros bloqueados ou convertidos com taxa registrada.

4. Venda completed com ctwaclid
   Esperado: entra em receita realizada atribuida Meta.

5. Venda pending com ctwaclid
   Esperado: entra em receita pendente, nao em ROAS.

6. gclid sem Meta IDs
   Esperado: entra como other paid, nao como Meta paid.

7. Duas organizacoes com dados semelhantes
   Esperado: nenhuma query/cache mistura dados.
```

---

## Commits Sugeridos

```bash
git commit -m "feat(analytics): add dashboard metric read models"
git commit -m "feat(meta-ads): sync insights to local daily facts"
git commit -m "feat(dashboard): project executive metrics from local facts"
git commit -m "feat(dashboard): render executive dashboard from read models"
git commit -m "test(dashboard): cover attribution and metric projectors"
```

---

**Status:** pronto para execucao correta
