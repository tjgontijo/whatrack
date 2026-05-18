# Context: Alinhamento ao Next.js 16

**Ultima atualizacao:** 2026-05-18

---

## 📌 O Que Mudou no Next.js 16

### Rendering: dinamico por padrao

No Next.js 15, rotas eram estaticas por padrao. `force-dynamic` era necessario para garantir execucao a cada request.

No Next.js 16, o modelo inverteu: **tudo e dinamico por padrao**. Cache e opt-in explícito via `"use cache"`. O `force-dynamic` virou ruido semantico — nao quebra nada, mas enganosa quem le o codigo.

```txt
Next.js 15: estatico por padrao → force-dynamic para optar por dinamico
Next.js 16: dinamico por padrao → "use cache" para optar por cache
```

### `"use cache"` estavel

Diretiva de cache que substitui o modelo anterior. Pode ser colocada no topo de um arquivo (cacheia todas as funcoes exportadas) ou dentro de uma funcao especifica.

```ts
async function getPlans() {
  "use cache"
  cacheLife("hours")
  cacheTag("billing-plans")
  return findActivePlansRepository()
}
```

APIs relacionadas — todas estaveis no Next.js 16:
- `cacheLife(profile)` — define TTL usando perfis padrao: `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`
- `cacheTag(tag)` — associa tag para invalidacao granular
- `revalidateTag(tag)` — agenda revalidacao (background, assíncrono)
- `updateTag(tag)` — invalida imediatamente na mesma request (apenas em Server Actions)

### `proxy.ts` substitui `middleware.ts`

`middleware.ts` foi renomeado para `proxy.ts`. Roda Node.js completo (nao Edge). O projeto ja usa `proxy.ts` — alinhado.

### Funcoes dinamicas obrigatoriamente async

`cookies()`, `headers()`, `params`, `searchParams` sao todas `Promise` no Next.js 16. Uso síncrono gera erro TypeScript. O projeto ja usa `await` em todas — alinhado.

---

## 📌 O Que e Este PRD

Este PRD nao cobre funcionalidades novas. Cobre tres adequacoes tecnicas ao Next.js 16:

1. **Env vars sem validacao centralizada** — risco operacional, diagnostico difícil em producao
2. **`force-dynamic` redundante** — ruido semantico em 50 arquivos
3. **Zero cache** — oportunidade de performance em dados publicos/semi-estaticos

**O que NAO e:**
- Nao e refactor de arquitetura de features (coberto no PRD-002)
- Nao e otimizacao de queries de banco (coberto no PRD-003)
- Nao e adicao de novas funcionalidades

---

## 🔄 Fluxo Atual de Env Vars

```txt
.env (arquivo local)
  ↓
process.env.FOO_BAR (direto no codigo, espalhado)
  ↓
Sem validacao no boot
  ↓
Falha silenciosa em runtime se var ausente
```

### Fluxo Alvo

```txt
.env (arquivo local)
  ↓
src/lib/env.ts (schema Zod, parse no modulo load)
  ↓
Falha explicita no boot se var obrigatoria ausente
  ↓
import { env } from "@/lib/env" em qualquer arquivo
```

---

## 💾 Inventario de Env Vars do Projeto

### Server-only (sem prefixo)

| Variavel | Uso | Obrigatoria |
|----------|-----|-------------|
| `DATABASE_URL` | Prisma | Sim |
| `BETTER_AUTH_SECRET` | HMAC signing, autenticacao | Sim |
| `BETTER_AUTH_URL` | better-auth | Sim |
| `REDIS_URL` | BullMQ, jobs | Sim |
| `ASAAS_API_KEY` | pagamentos | Condicional |
| `ASAAS_BASE_URL` | pagamentos | Condicional |
| `ASAAS_WEBHOOK_TOKEN` | webhook billing | Condicional |
| `WALLET_ASAAS_ID` | billing | Condicional |
| `CENTRIFUGO_URL` | realtime | Sim |
| `CENTRIFUGO_API_KEY` | realtime | Sim |
| `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY` | token signing | Sim |
| `CENTRIFUGO_ADMIN_PASSWORD` | admin | Opcional |
| `CENTRIFUGO_ADMIN_SECRET` | admin | Opcional |
| `META_APP_ID` | Meta/WhatsApp | Sim |
| `META_APP_SECRET` | webhook verification | Sim |
| `META_ACCESS_TOKEN` | Meta API | Condicional |
| `META_API_VERSION` | Meta API | Sim |
| `META_ADS_APP_ID` | Meta Ads | Condicional |
| `META_ADS_APP_SECRET` | Meta Ads | Condicional |
| `META_ADS_APP_TOKEN` | Meta Ads | Condicional |
| `META_ADS_APP_CONFIG_ID` | Meta Ads | Condicional |
| `META_OAUTH_REDIRECT_URI` | OAuth redirect | Opcional |
| `META_WEBHOOK_VERIFY_TOKEN` | webhook | Sim |
| `OWNER_EMAIL` | seed, admin | Sim |
| `APP_URL` | URLs internas, callbacks | Sim |
| `APP_NAME` | emails, UI | Opcional |
| `RESEND_API_KEY` | emails | Sim |
| `RESEND_FROM` | emails | Sim |
| `ENCRYPTION_KEYS` | criptografia | Sim |
| `ENCRYPTION_CURRENT_VERSION` | criptografia | Opcional |
| `CRON_SECRET` | autenticacao cron | Sim |
| `WHATSAPP_MANUAL_SEND_BEARER_TOKEN` | endpoint interno | Opcional |
| `ACTIVE_PAYMENT_PROVIDER` | billing | Opcional |
| `LOG_LEVEL` | logging | Opcional |
| `HISTORY_SYNC_ALERT_TOKEN` | alert interno | Opcional |
| `GOOGLE_API_KEY` | AI | Opcional |
| `GROQ_API_KEY` | AI | Opcional |
| `OPENAI_API_KEY` | AI | Opcional |
| `STRIPE_SECRET_KEY` | pagamentos | Condicional |
| `STRIPE_WEBHOOK_SECRET` | webhook Stripe | Condicional |
| `META_PHONE_ID` | WhatsApp | Condicional |
| `META_WABA_ID` | WhatsApp | Condicional |

### Client (prefixo `NEXT_PUBLIC_`)

| Variavel | Uso |
|----------|-----|
| `NEXT_PUBLIC_APP_URL` | URLs no client |
| `NEXT_PUBLIC_APP_NAME` | nome do app |
| `NEXT_PUBLIC_CENTRIFUGO_URL` | WebSocket client |
| `NEXT_PUBLIC_META_APP_ID` | SDK Meta client |
| `NEXT_PUBLIC_META_CONFIG_ID` | SDK Meta client |
| `NEXT_PUBLIC_META_API_VERSION` | SDK Meta client |
| `NEXT_PUBLIC_OWNER_EMAIL` | UI condicional |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client (falta prefixo NEXT_PUBLIC — a confirmar) |

---

## 🎯 Candidatos a `"use cache"`

Dados que raramente mudam e nao dependem de sessao de usuario:

| Endpoint / Service | TTL Sugerido | Tag |
|--------------------|-------------|-----|
| `GET /api/v1/billing/plans` — lista planos publicos | `hours` | `billing-plans` |
| `GET /api/v1/system/billing-plans` — planos admin | `hours` | `billing-plans-admin` |
| `listPublicBillingPlans` service | `hours` | `billing-plans` |
| Config da aplicacao (app name, URLs) | `max` | `app-config` |

Dados que NAO devem ser cacheados sem cuidado:
- Qualquer endpoint autenticado com dados por usuario/org
- Webhooks (sempre dinamicos)
- Cron endpoints

---

## 📝 Resumo para Implementacao

- T1 (env.ts): criar arquivo, definir schema Zod, migrar 25 arquivos — nao mudar comportamento, apenas centralizar
- T2 (force-dynamic): remocao em massa via sed ou busca-e-substitui — sem impacto funcional no Next.js 16
- T3 (use cache): adicionar `"use cache"` apenas em funcoes claramente sem estado de sessao — testar que dados retornam corretamente apos cache warm e invalidacao
