# Diagnostic: Alinhamento Next.js 16

**Data:** 2026-05-18
**Status:** Auditoria concluida
**Escopo:** src/app, src/features, src/lib, src/server

---

## 📋 Resumo Executivo

Projeto esta funcional e alinhado com PRD-002 (arquitetura). Tres violacoes residuais especificas do Next.js 16 identificadas:

- 🔴 0 Criticos
- 🟡 2 Moderados: env vars sem validacao, force-dynamic redundante
- 🟢 1 Menor: ausencia de cache em dados publicos

**Conclusao:** nenhum bloqueador. Adequacoes de qualidade, robustez e performance.

---

## 🟡 Problemas Moderados

### 1. `process.env` direto em 25 arquivos sem validacao no boot

**Problema:** Nao existe `src/lib/env.ts`. Variaveis de ambiente sao acessadas diretamente via `process.env.FOO` em services, routes e features. Se uma variavel obrigatoria estiver ausente, a aplicacao sobe sem erro e falha silenciosamente em runtime.

**Localizacoes:**

```
src/features/billing/services/asaas-config.service.ts:18-21  — 4 vars ASAAS
src/features/billing/services/checkout-status-token.service.ts:13  — BETTER_AUTH_SECRET
src/features/whatsapp/services/meta-cloud.service.ts:7,47,60,67,83,748  — 6 vars META
src/features/whatsapp/lib/webhook-signature.ts:13  — META_APP_SECRET
src/features/whatsapp/lib/onboarding.ts:4-5  — 2 vars NEXT_PUBLIC_META
src/features/whatsapp/services/whatsapp-onboarding.service.ts:38-40  — 3 vars META
src/features/whatsapp/hooks/use-whatsapp-onboarding.ts:55,285  — 2 vars NEXT_PUBLIC_META
src/app/api/v1/centrifugo/token/route.ts:33  — CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
src/app/api/v1/system/webhook-verify-token/route.ts:18  — META_WEBHOOK_VERIFY_TOKEN
src/app/api/v1/billing/checkout/route.ts:92  — NODE_ENV
src/app/api/v1/whatsapp/send-template/manual/route.ts:10,32  — WHATSAPP_MANUAL_SEND_BEARER_TOKEN
src/app/api/v1/whatsapp/webhook/route.ts:11  — META_WEBHOOK_VERIFY_TOKEN
src/app/api/v1/whatsapp/activate/route.ts:10  — META_API_VERSION
src/app/api/v1/meta-ads/connect/route.ts:16,18  — META_ADS_APP_ID, META_OAUTH_REDIRECT_URI
src/app/(auth)/sign-up/page.tsx:56  — NEXT_PUBLIC_OWNER_EMAIL
src/features/whatsapp/lib/client.ts:10  — META_API_VERSION
```

**Total:** 29 variaveis distintas, ~25 arquivos.

**Impacto:**

- ⚠️ Segredos como `BETTER_AUTH_SECRET`, `META_APP_SECRET`, `ASAAS_API_KEY` podem ser `undefined` sem aviso
- ⚠️ Sem inventario centralizado do que o projeto precisa para funcionar
- ⚠️ Erro em producao aparece como `TypeError: Cannot read property of undefined` em vez de mensagem clara no boot
- ⚠️ Nao segue principio 14 da SKILL.md (`env vars via env.ts`)

**Solucao:**

1. Criar `src/lib/env.ts` com schema Zod dividido em server e client
2. Migrar todos os 25 arquivos para importar `env` em vez de `process.env`
3. Vars opcionais: `z.string().optional()` — sem falhar o boot
4. Vars obrigatorias: `z.string().min(1)` — fail fast no boot

---

### 2. `export const dynamic = "force-dynamic"` em 50 arquivos

**Problema:** No Next.js 16, rendering e dinamico por padrao. O `force-dynamic` nao tem efeito pratico, mas cria ruido semantico — dev que le o codigo pode assumir que remover essa linha tornaria o endpoint estatico (o que nao e verdade).

**Localizacoes:**

```
src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx  — 1 layout
src/app/(public)/checkout/page.tsx  — 1 page
src/app/(public)/welcome/page.tsx  — 1 page
src/app/api/v1/whatsapp/*.ts  — ~30 routes
src/app/api/v1/billing/*.ts  — ~8 routes
src/app/api/v1/system/*.ts  — ~6 routes
```

Total: 50 arquivos.

**Impacto:**

- ⚠️ Semantica enganosa para novos devs
- ⚠️ Inconsistencia com SKILL.md (Next.js 16 = dinamico por padrao, `force-dynamic` obsoleto)
- 🟢 Sem impacto funcional em producao

**Solucao:**

Remocao em massa via sed. Nenhum comportamento muda.

---

## 🟢 Problemas Menores

### 3. Zero uso de `"use cache"` — dados publicos sem cache

**Problema:** Endpoints que servem dados publicos e raramente mutaveis (billing plans, configuracoes) sao buscados do banco a cada request. Com o modelo do Next.js 16, `"use cache"` esta estavel e e a forma idiomatica de cachear.

**Candidatos identificados:**

```
GET /api/v1/billing/plans  — lista planos publicos (muda apenas quando admin altera)
GET /api/v1/system/billing-plans  — lista planos admin
src/features/billing/services/billing-plan-catalog.service.ts > listPublicBillingPlans
```

**Impacto:**

- 🟢 Cada request carrega planos do banco mesmo que nao tenham mudado
- 🟢 Sem impacto critico, mas oportunidade de performance facil

**Solucao:**

Adicionar `"use cache"` + `cacheLife("hours")` + `cacheTag("billing-plans")` em `listPublicBillingPlans`. Adicionar `revalidateTag("billing-plans")` nas mutations de billing plan admin.

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| `proxy.ts` no lugar de `middleware.ts` | ✅ | `src/proxy.ts` existe |
| `cookies()` sempre com `await` | ✅ | grep sem ocorrencias sincronas |
| `params` como Promise awaited | ✅ | todos os layouts e pages usam `await params` |
| Sem `unstable_cacheLife`/`unstable_cacheTag` | ✅ | grep sem ocorrencias |
| `server-only` nos servicos e repositories | ✅ | PRD-002 concluido |
| Sem `prisma` direto em routes | ✅ | PRD-002 concluido |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| process.env sem validacao | Medio | Media | MEDIO | 2-3h |
| force-dynamic redundante | Baixo | Baixa | BAIXO | 30min |
| Zero cache em dados publicos | Baixo | Baixa | BAIXO | 1-2h |

---

## 🎯 Ordem de Fixacao

### Fase 1: Robustez (3-3.5h)

1. T1: Criar `src/lib/env.ts` e migrar 25 arquivos (2-3h)
2. T2: Remover `force-dynamic` de 50 arquivos (30min)

### Fase 2: Performance (1-2h)

3. T3: Adicionar `"use cache"` em billing plans e config (1-2h)

**Total Estimado:** 4-5.5h

---

## 📝 Proximos Passos

1. ✅ Revisar este DIAGNOSTIC.md
2. ⬜ Ler CONTEXT.md
3. ⬜ Ler TASKS.md
4. ⬜ Executar T1 → build → commit
5. ⬜ Executar T2 → build → commit
6. ⬜ Executar T3 → build → commit

---

**Status:** Pronto para execucao
