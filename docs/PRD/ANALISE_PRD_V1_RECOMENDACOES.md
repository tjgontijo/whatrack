# Análise dos PRDs V1 — Recomendações para Launch

**Data**: 2026-03-07
**Base**: código atual em `src/`, git status, PRDs ativos (00-08), `vercel.json`

---

## Visão Geral

O conjunto de PRDs melhorou significativamente com a inclusão do domínio de Scheduling e a decisão explícita de `n8n` como scheduler oficial. A maior parte das correções que eu faria na versão anterior já foram incorporadas pelo autor.

**Veredito**: os PRDs estão alinhados com o código. O gargalo continua sendo checkpoint do worktree, setup operacional e smoke real.

---

## 00 — Force Task Index

**Qualidade**: Excelente. Decisões fechadas estão corretas e refletem a realidade do código.

**O que melhorou**: a inclusão de `n8n` nas decisões fechadas e na ordem da força-tarefa resolve a lacuna operacional que existia antes.

**Ponto aberto**: o gate de go/no-go lista 8 itens mas não diferencia bloqueantes de degradáveis. Se Meta Ads falhar no OAuth mas todo o resto passar, o launch é go ou no-go? Recomendo classificar explicitamente:
- **Bloqueante**: billing webhook, n8n configurado, job de IA rodando, fluxo onboarding+compra, fluxo WhatsApp→IA→venda
- **Degradável com ajuste de copy**: Meta Ads, AI Studio

---

## 01 — Release Operations

**Qualidade**: Bom. A adição de `n8n` no escopo e nos critérios de aceite foi a correção certa.

**Estado real do código**:
- 4 diretórios vazios (sem `route.ts`): `/debug`, `/debug/auth`, `/billing/debug`, `/billing/test`
- 3 rotas sem consumidor no produto:
  - `/api/v1/test/publish-message` — teste de Centrifugo. **Remover**
  - `/api/v1/health/redis` — público, sem auth, sem consumidor (só em teste de proxy). **Remover**
  - `/api/v1/whatsapp/history-sync-alerts` — GET base público retornando JSON estático, sem consumidor. **Remover** (service + teste órfão junto)
- `/api/v1/cron/ai-classifier` existe e é duplicata funcional de `/api/v1/jobs/ai-classifier` — o PRD 02 e 05 já identificam essa ambiguidade

**Recomendações**:
1. Deletar: 4 diretórios vazios + 3 rotas sem consumidor + `/cron/ai-classifier` (após confirmar que não tem lógica exclusiva — ver nota no domínio 05)
2. **Risco de execução duplicada no `vercel.json`**: hoje agenda `whatsapp-health-check` (02:00 UTC) e `webhook-retry` (03:00 UTC) 1x/dia. O PRD 02 pede que n8n rode esses mesmos jobs com frequência muito maior. Se ambos ficarem ativos, haverá execução duplicada. Decisão: remover crons do `vercel.json` ou manter como fallback documentado
3. Smoke manual continua sendo a tarefa mais importante

**Esforço**: Médio. ~3-4h (corte de rotas + resolução de ambiguidade vercel.json/n8n + smoke).

---

## 02 — Scheduling N8N

**Qualidade**: Muito bom. É o PRD mais necessário desta versão — transforma uma dependência implícita em contrato explícito.

**Estado real do código**:
- 3 jobs em `/api/v1/jobs/*` — todos com Bearer `CRON_SECRET`
- `ai-classifier` com lock distribuído Redis e `maxDuration: 60`
- 1 duplicata em `/api/v1/cron/ai-classifier` — sem lock distribuído, chama service diferente (`runAiClassifierCron` vs `drainDueClassifications`)
- `vercel.json` agenda 2/3 jobs com frequência insuficiente (1x/dia vs 1min e 5min recomendados)

**Pontos fortes do PRD**:
- Frequências realistas: ai-classifier 1min, webhook-retry 5min, health-check 1x/dia
- Decisão clara de que `/api/v1/cron/*` não é contrato oficial
- History-sync-alerts como opcional

**Pontos de atenção**:
1. **`vercel.json` não abordado**: o PRD não prescreve o destino do `vercel.json`. Sem decisão, haverá dois schedulers rodando os mesmos jobs. Recomendo remover os crons do `vercel.json` e documentar que n8n é a única fonte
2. **Ambiguidade `/cron/ai-classifier` vs `/jobs/ai-classifier`**: o PRD identifica mas não prescreve ação. Os dois endpoints chamam services diferentes — verificar se `runAiClassifierCron()` tem lógica exclusiva antes de deletar

**Esforço**: Baixo-Médio. ~1-2h (configurar 3 workflows no n8n + testar com curl).

---

## 03 — Billing

**Qualidade**: Bom. A adição do gap sobre `webhook-retry` via n8n mostra alinhamento com o novo domínio de scheduling.

**Estado real do código**:
- 6 rotas completas, 3 services maduros, provider abstraction com AbacatePay v1 REST
- Webhook security HMAC-SHA256 com timing-safe comparison
- Schemas Zod com cobertura completa
- PRD agora referencia corretamente `src/lib/billing/plans.ts` e `src/lib/billing/providers/providers/abacatepay-provider.ts`
- **Refactor não commitado**: `src/lib/payments/` deletado, `src/lib/billing/` criado, não versionado

**Recomendações**:
1. **URGENTE**: checkpoint do worktree inteiro — billing é o domínio com mais mudanças pendentes
2. Validar checkout→pagamento→webhook→assinatura com evento real
3. Para produção: `prisma migrate deploy` (não `db push`) — o projeto usa `prisma/migrations`
4. UI de cancelamento: comunicar "plano ativo até fim do período"

**Esforço**: Médio. ~2-3h (commit + validação real + migration).

**Risco crítico**: worktree não commitado.

---

## 04 — WhatsApp

**Qualidade**: Adequado. O gap sobre rotinas operacionais ligadas ao n8n é a melhoria certa.

**Estado real do código**:
- 17 rotas de API, 17 arquivos de service — domínio mais completo
- `whatsapp-health-check` configurado em `/api/v1/jobs/` com Bearer auth

**Recomendações**:
1. Das 17 rotas, smoke deve cobrir: onboarding → webhook recebe mensagem → inbox atualiza → lead/ticket criado
2. `history-sync-alerts` já decidido como opcional no PRD 02, candidato a remoção no PRD 01
3. Tarefa 5 do PRD ("confirmar rotina operacional no n8n, se existir") — `whatsapp-health-check` precisa estar no n8n

**Esforço**: Médio. ~2-3h (depende de conta sandbox/produção disponível).

**Risco principal**: conta Meta Business aprovada é pré-requisito externo ao código.

---

## 05 — AI Copilot

**Qualidade**: Bom. A adição sobre ambiguidade entre endpoints e referência ao n8n são as correções certas.

**Estado real do código**:
- 3 rotas de API, job endpoint funcional, 13 services, 5 testes
- `/api/v1/jobs/ai-classifier`: lock distribuído Redis, drena até 20 tickets, `maxDuration: 60`, chama `drainDueClassifications()` + `dispatchAiEvent()`
- `/api/v1/cron/ai-classifier`: **sem lock**, chama `runAiClassifierCron()` — service diferente

**Ponto importante**: os dois endpoints não são apenas URLs diferentes — são implementações distintas. `/jobs/` é mais robusto (lock, batch de 20, maxDuration). Antes de deletar `/cron/`, verificar se `runAiClassifierCron()` faz algo que `drainDueClassifications()` não faz.

**Recomendações**:
1. Comparar as duas implementações. Se `/jobs/` cobre tudo, deletar `/cron/`
2. n8n: GET `/api/v1/jobs/ai-classifier` a cada 1 min com Bearer CRON_SECRET
3. Smoke: mensagem → classificação → sugestão → aprovação → venda
4. AI Studio: esconder na nav ou marcar "Beta"

**Esforço**: Médio. ~2h (verificação + n8n + smoke).

**Dependência**: WhatsApp precisa funcionar primeiro.

---

## 06 — Meta Ads

**Qualidade**: Adequado. Sem mudanças nesta versão.

**Estado real do código**:
- 10 rotas de API, 14 services, CAPI implementado, OAuth completo

**Recomendações**:
1. **Semi-bloqueante**. Landing vende rastreio + CAPI + Meta em `types.ts`, sidebar expõe como módulo oficial. Degradar sem ajustar copy gera incoerência
2. Validação mínima: conta conecta → campanhas no dashboard → 1 evento CAPI no Events Manager
3. `copilot-analyze` não precisa de validação para launch
4. Permissões Meta App Review (`ads_read`, `ads_management`): verificar HOJE

**Se degradar**: ajustar `types.ts` + esconder em `sidebar.tsx`.

**Esforço**: Baixo-Médio. ~1-2h se credenciais OK.

---

## 07 — Acquisition / Auth / Onboarding

**Qualidade**: Bom. Sem mudanças, não precisa de mudanças.

**Recomendações**:
1. Smoke: landing → cadastro → login → cria org → dashboard
2. Copy alinhada com "IA assistida, não autônoma"
3. Convites: suportado, não frente de launch
4. Edge case: usuário logado sem organização → onboarding dialog deve aparecer

**Esforço**: Baixo. ~1h. **Provavelmente já está pronto.**

---

## 08 — CRM Operations

**Qualidade**: Adequado. Consumidor dos outros domínios.

**Recomendações**:
1. Smoke do AI Copilot já valida 80% deste domínio
2. Dashboard com dados vazios deve mostrar zeros, não erros
3. Seed: pelo menos 1 item no catálogo para fluxo de aprovação

**Esforço**: Baixo. ~30min de validação visual.

---

## Resumo Executivo

### Faça AGORA (bloqueante):
1. **Checkpoint do worktree inteiro** — commitar em commits atômicos por domínio
2. **Deletar superfície morta**: 4 diretórios vazios + 3 rotas sem consumidor

### Faça HOJE (necessário para go):
3. **Configurar n8n**: ai-classifier 1min, webhook-retry 5min, whatsapp-health-check 1x/dia
4. **Resolver `vercel.json`**: remover crons ou documentar coexistência com n8n
5. **Resolver ambiguidade `/cron/ai-classifier` vs `/jobs/ai-classifier`**: comparar implementações, deletar a legada
6. **Executar `prisma migrate deploy`** no banco de produção
7. **Smoke completo**: Auth → Billing → WhatsApp → IA → CRM

### Decisão pendente:
8. **Meta Ads**: go, degradar com ajuste de copy, ou adiar?

### Domínios por risco de bloqueio:

| Domínio | Risco | Motivo |
|---------|-------|--------|
| Billing | **ALTO** | Worktree carregado não commitado, precisa de validação real |
| Scheduling N8N | **ALTO** | Sem scheduler externo, IA e retries ficam mortos |
| AI Copilot | **MEDIO** | Depende de n8n + WhatsApp funcionando |
| WhatsApp | **MEDIO** | Depende de conta Meta Business aprovada |
| Meta Ads | **MEDIO** | Semi-bloqueante: degradar exige ajustar copy da landing e sidebar |
| Auth/Onboarding | **BAIXO** | Provavelmente já funciona |
| CRM | **BAIXO** | Consumidor dos outros domínios |
| Release Ops | **BAIXO** | Limpeza + decisões pontuais |

---

## Opinião Final

Os PRDs estão maduros para execução. A inclusão do domínio de Scheduling foi a decisão mais importante desta versão — transformou uma dependência implícita em contrato explícito.

Três coisas separam o estado atual do go: (1) checkpoint do worktree, (2) n8n configurado, (3) smoke real. Sem essas três, é aposta. Com essas três, é execução — e o que quebrar na semana 1, corrige na semana 1.
