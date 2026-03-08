# Análise dos PRDs V1 — Recomendações para Launch

**Data**: 2026-03-08
**Base**: código na branch `launch-v1`, PRDs 00-09, git status pós-implementação

---

## Visão Geral — Estado Pós-Implementação

Os PRDs 01-08 foram implementados. O código está limpo:

- Rotas legadas removidas (`/jobs/*`, `/test/*`, `/health/*`, `/debug/*`, `/billing/debug`, `/billing/test`)
- `history-sync-alerts` removido (rota + service + teste)
- `src/lib/payments/` substituído por `src/lib/billing/` — versionado
- `vercel.json` removido
- Cron reestruturado em `/api/v1/cron/[domain]/[function]` com auth centralizada, lock distribuído e schemas
- Sem diretórios vazios em `src/`
- Branch `launch-v1` com 8 commits atômicos por PRD

**O que resta agora é exclusivamente operacional.** O PRD 09 captura isso corretamente.

---

## 00 — Force Task Index

**Status**: Atualizado e alinhado com a realidade. A seção "Estado Atual da Força-Tarefa" confirmando os 8 PRDs implementados e apontando para o 09 é o fechamento correto.

**Único ponto aberto**: o gate de go/no-go ainda não diferencia explicitamente bloqueantes de degradáveis. O PRD 09 resolve isso na seção "Decisões de Go/No-Go" — mas o Index deveria referenciar isso para ficar autocontido.

---

## 01 — Release Operations ✅ Implementado

**Verificação do código**:
- 4 diretórios vazios: removidos
- `/test/publish-message`: removido
- `/health/redis`: removido
- `/whatsapp/history-sync-alerts`: removido (service e teste junto)
- `vercel.json`: removido — ambiguidade resolvida
- Rotas duplicadas (`/jobs/*` vs `/cron/*`): unificadas em `/cron/*`

**Pendência do PRD 09**: smoke manual. Ainda não executado.

---

## 02 — Scheduling N8N ✅ Implementado

**Verificação do código**:
- 3 rotas oficiais em `/api/v1/cron/*` — todas POST, com `authorizeCronRequest` + `cronTriggerBodySchema`
- `cron-auth.ts` com rate limit + Bearer validation via `requireEnv('CRON_SECRET')`
- `cron-execution.service.ts` com lock distribuído genérico (`executeLockedCronJob`)
- `ai-classifier-cron.service.ts` usa `drainDueClassifications` + `dispatchAiEvent` com lock — a divergência de implementação entre `/jobs/` e `/cron/` antigos foi resolvida
- Guia operacional em `docs/GUIDE/n8n_cron_setup.md` com curl examples, frequências e regras
- `vercel.json` removido

**O que falta é configurar o n8n real (PRD 09).**

**Nota sobre o guia n8n**: está diretamente executável. A instrução sobre tratar `429` como lock ativo (não como falha) é um detalhe operacional que evita falsos alertas.

---

## 03 — Billing ✅ Implementado

**Verificação do código**:
- 6 rotas operacionais, 3 services, webhook handler com testes
- `src/lib/billing/` versionado com 8 arquivos (plans, providers, webhook-security)
- `src/lib/payments/` completamente removido

**Pendência do PRD 09**: migration deploy + seeds + validação real de checkout→webhook→assinatura.

---

## 04 — WhatsApp ✅ Implementado

**Verificação do código**:
- Rotas auxiliares removidas
- `whatsapp-health-check` consolidado em `/api/v1/cron/whatsapp/health-check`

**Pendência do PRD 09**: validação com conta real + smoke.

---

## 05 — AI Copilot ✅ Implementado

**Verificação do código**:
- Endpoint oficial: `POST /api/v1/cron/ai/classifier` com lock distribuído
- Ambiguidade resolvida: rotas legadas (`/jobs/ai-classifier`, `/cron/ai-classifier` antigo) removidas
- `runAiClassifierCronJob()` usa `executeLockedCronJob` → `drainDueClassifications` + `dispatchAiEvent` — implementação correta e com lock
- PRD atualizado referenciando o endpoint correto

**Pendência do PRD 09**: n8n configurado + smoke do fluxo completo.

---

## 06 — Meta Ads ✅ Implementado (código)

Sem mudanças no código nesta fase — domínio já estava completo.

**Pendência do PRD 09**: decisão explícita de go vs degradação. Se degradar, landing e sidebar precisam de ajuste.

---

## 07 — Acquisition / Auth / Onboarding ✅ Implementado

**Pendência do PRD 09**: smoke manual.

---

## 08 — CRM Operations ✅ Implementado

**Pendência do PRD 09**: seed de dados mínimos + validação visual.

---

## 09 — Launch Residuals (novo)

**Qualidade**: Bom. Consolida apenas o que falta sem reabrir escopo.

### Análise ponto a ponto:

**1. Infra Externa Obrigatória**

Os 3 endpoints listados estão corretos e alinhados com o código. O guia `docs/GUIDE/n8n_cron_setup.md` tem tudo que o operador precisa — endpoint, método, header, body, curl.

**Risco real**: se o `CRON_SECRET` de produção divergir do configurado no n8n, todos os jobs retornam 401. Testar com curl antes de confiar no schedule.

**2. Banco e Ambiente de Produção**

O git status mostra uma migration pendente:
```
D prisma/migrations/20260307230140_init/migration.sql
?? prisma/migrations/20260308152858_init/
```

A migration foi recriada. **Precisa commitar antes do deploy** — senão `prisma migrate deploy` não encontra o arquivo.

O checklist de variáveis (auth, billing, WhatsApp/Meta, Redis, OpenAI, cron secret) está correto mas genérico. Para execução segura, rodar um diff automatizado das env vars ao invés de validar de memória.

**3. Smoke Manual de Launch**

Os 6 fluxos listados são os corretos e na ordem certa:
1. Auth → Onboarding (pré-requisito para tudo)
2. Checkout → Billing (pré-requisito para uso)
3. WhatsApp → Lead/Ticket (pré-requisito para IA)
4. IA → Insight → Aprovação → Venda (fluxo core)
5. Fechamento manual → Sale (validação CRM)
6. Meta Ads (se estiver no escopo)

**Gap**: o PRD não define o que fazer quando um smoke falha. Recomendo: falha nos fluxos 1-4 = no-go. Falha no 5 ou 6 = go com degradação documentada.

**4. Decisões de Go/No-Go**

A classificação bloqueante vs degradável está correta. Único gap: degradar Meta Ads requer alterar código (`types.ts` + `sidebar.tsx`). Isso deveria estar previsto como diff pronto, não como decisão de última hora.

**5. Checklist Curta de Amanhã**

Boa. Operacional e direta.

---

## Resumo: O que Separa o Estado Atual do Go-Live

### Commitar AGORA:
1. **Migration pendente** — `prisma/migrations/20260308152858_init/` está untracked. Sem commit, o deploy não leva a migration

### Operação n8n (~1h com o guia pronto):
2. Criar 3 workflows seguindo `docs/GUIDE/n8n_cron_setup.md`
3. Testar cada um com curl antes de ativar o schedule
4. Confirmar `CRON_SECRET` no ambiente de produção

### Banco de produção:
5. `prisma migrate deploy`
6. Seeds obrigatórios (billing plan templates, catálogo mínimo de itens)
7. Validar variáveis de ambiente com diff automatizado

### Smoke (~2-3h):
8. Auth → Checkout → WhatsApp → IA → CRM → Meta Ads (se go)

### Decisão pendente:
9. Meta Ads: go ou degradar? Se degradar, ter diff pronto para `types.ts` + `sidebar.tsx`

### Domínios por risco:

| Domínio | Código | Operação | Bloqueio |
|---------|--------|----------|----------|
| Release Ops | ✅ Limpo | Smoke pendente | Baixo |
| Scheduling | ✅ Implementado | n8n não configurado | **ALTO** |
| Billing | ✅ Implementado | Migration + validação real | **ALTO** |
| WhatsApp | ✅ Implementado | Conta Meta Business | Médio |
| AI Copilot | ✅ Implementado | Depende de n8n + WhatsApp | Médio |
| Meta Ads | ✅ Implementado | OAuth + App Review | Médio |
| Auth/Onboarding | ✅ Implementado | Smoke | Baixo |
| CRM | ✅ Implementado | Seed + validação visual | Baixo |

---

## Opinião Final

O código está pronto. O PRD 09 acerta ao dizer que "o maior risco restante não está mais no código versionado — está na operação externa do launch."

Três ações concretas separam o estado atual do go-live:
1. **Commitar a migration** (5 minutos)
2. **Configurar o n8n** (~1h com o guia pronto)
3. **Smoke real** (~2-3h)

Depois dessas três, a decisão de go/no-go é baseada em evidência, não em incerteza.
