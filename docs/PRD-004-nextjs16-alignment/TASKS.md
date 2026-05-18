# Tasks: PRD-004 Next.js 16 Alignment

**Data:** 2026-05-18 | **Status:** Pendente | **Total Tasks:** 3 | **Estimado:** 4-6h

---

## 🟡 Fase 1: Robustez (3-3.5h)

### T1: Criar `src/lib/env.ts` e migrar todos os `process.env` diretos (2-3h)

**Problema:** 29 variaveis acessadas via `process.env` espalhadas em 25 arquivos sem validacao no boot.

**Localizacao:** criar `src/lib/env.ts` — migrar todos os arquivos listados no DIAGNOSTIC.md.

**O que fazer:**

1. Criar `src/lib/env.ts` com dois schemas Zod: `serverEnv` (server-only) e `clientEnv` (NEXT_PUBLIC_)
2. Exportar `env` como merge dos dois para uso server-side, e `clientEnv` para uso no client
3. Migrar cada arquivo para importar `env` em vez de `process.env`
4. Vars obrigatorias: `z.string().min(1)` — falha no boot se ausente
5. Vars opcionais: `z.string().optional()` ou `.default(valor)`

```ts
// src/lib/env.ts
import "server-only"
import { z } from "zod"

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  APP_URL: z.string().url(),
  APP_NAME: z.string().default("Whatrack"),
  OWNER_EMAIL: z.string().email(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().email(),
  CRON_SECRET: z.string().min(1),
  ENCRYPTION_KEYS: z.string().min(1),
  ENCRYPTION_CURRENT_VERSION: z.string().optional(),
  CENTRIFUGO_URL: z.string().url(),
  CENTRIFUGO_API_KEY: z.string().min(1),
  CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: z.string().min(1),
  CENTRIFUGO_ADMIN_PASSWORD: z.string().optional(),
  CENTRIFUGO_ADMIN_SECRET: z.string().optional(),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_API_VERSION: z.string().default("v19.0"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  META_ACCESS_TOKEN: z.string().optional(),
  META_ADS_APP_ID: z.string().optional(),
  META_ADS_APP_SECRET: z.string().optional(),
  META_ADS_APP_TOKEN: z.string().optional(),
  META_ADS_APP_CONFIG_ID: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  META_PHONE_ID: z.string().optional(),
  META_WABA_ID: z.string().optional(),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  WALLET_ASAAS_ID: z.string().optional(),
  ACTIVE_PAYMENT_PROVIDER: z.enum(["asaas", "stripe"]).optional(),
  WHATSAPP_MANUAL_SEND_BEARER_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  HISTORY_SYNC_ALERT_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export const env = serverSchema.parse(process.env)
```

Para variaveis client, criar arquivo separado sem `server-only`:

```ts
// src/lib/env.client.ts  (sem server-only — importavel em Client Components)
import { z } from "zod"

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("Whatrack"),
  NEXT_PUBLIC_CENTRIFUGO_URL: z.string().url(),
  NEXT_PUBLIC_META_APP_ID: z.string().min(1),
  NEXT_PUBLIC_META_CONFIG_ID: z.string().min(1),
  NEXT_PUBLIC_META_API_VERSION: z.string().default("v19.0"),
  NEXT_PUBLIC_OWNER_EMAIL: z.string().email().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
})

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_CENTRIFUGO_URL: process.env.NEXT_PUBLIC_CENTRIFUGO_URL,
  NEXT_PUBLIC_META_APP_ID: process.env.NEXT_PUBLIC_META_APP_ID,
  NEXT_PUBLIC_META_CONFIG_ID: process.env.NEXT_PUBLIC_META_CONFIG_ID,
  NEXT_PUBLIC_META_API_VERSION: process.env.NEXT_PUBLIC_META_API_VERSION,
  NEXT_PUBLIC_OWNER_EMAIL: process.env.NEXT_PUBLIC_OWNER_EMAIL,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
})
```

Substituicoes a fazer:

```ts
// Antes
const secret = process.env.BETTER_AUTH_SECRET

// Depois
import { env } from "@/lib/env"
const secret = env.BETTER_AUTH_SECRET
```

```ts
// Antes (client component ou hook)
const appId = process.env.NEXT_PUBLIC_META_APP_ID!

// Depois
import { clientEnv } from "@/lib/env.client"
const appId = clientEnv.NEXT_PUBLIC_META_APP_ID
```

**Arquivos a migrar (server-only):**

- `src/features/billing/services/asaas-config.service.ts`
- `src/features/billing/services/checkout-status-token.service.ts`
- `src/features/whatsapp/services/meta-cloud.service.ts`
- `src/features/whatsapp/lib/webhook-signature.ts`
- `src/features/whatsapp/services/whatsapp-onboarding.service.ts`
- `src/features/whatsapp/lib/client.ts`
- `src/app/api/v1/centrifugo/token/route.ts`
- `src/app/api/v1/system/webhook-verify-token/route.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/api/v1/whatsapp/send-template/manual/route.ts`
- `src/app/api/v1/whatsapp/webhook/route.ts`
- `src/app/api/v1/whatsapp/activate/route.ts`
- `src/app/api/v1/meta-ads/connect/route.ts`

**Arquivos a migrar (client):**

- `src/features/whatsapp/lib/onboarding.ts`
- `src/features/whatsapp/hooks/use-whatsapp-onboarding.ts`
- `src/app/(auth)/sign-up/page.tsx`

**Aceitacao:**

- [ ] `src/lib/env.ts` existe com schema Zod completo
- [ ] `src/lib/env.client.ts` existe para vars NEXT_PUBLIC_
- [ ] Nenhum `process.env.FOO` direto fora de `env.ts` e `env.client.ts` (exceto `NODE_ENV` em comentarios/testes)
- [ ] Build passa sem erros
- [ ] Se rodar com var obrigatoria ausente, mensagem de erro clara aparece no boot (nao em runtime)

**Como testar:**

```bash
# Renomear .env temporariamente e tentar subir
mv .env .env.bak && npm run build
# Esperado: erro Zod claro listando var ausente

mv .env.bak .env && npm run build
# Esperado: build limpo
```

**Tempo:** 2-3h

---

### T2: Remover `export const dynamic = "force-dynamic"` de API routes (30min)

**Problema:** 50 arquivos com linha redundante no Next.js 16. Sem efeito funcional, com efeito semantico negativo.

**Localizacao:** todos os arquivos listados em `force-dynamic` no DIAGNOSTIC.md.

**O que fazer:**

Remocao em massa dos API routes (sem impacto funcional):

```bash
find src/app/api -name "route.ts" -exec sed -i '' "/export const dynamic = 'force-dynamic'/d" {} \;
```

Para pages e layouts — verificar caso a caso se ha `"use cache"` ou cache configurado antes de remover. Se nao houver cache, pode remover sem risco (comportamento permanece dinamico por padrao):

```bash
# Pages sem cache configurado — remover
sed -i '' "/export const dynamic = 'force-dynamic'/d" src/app/\(public\)/checkout/page.tsx
sed -i '' "/export const dynamic = 'force-dynamic'/d" src/app/\(public\)/welcome/page.tsx
sed -i '' "/export const dynamic = 'force-dynamic'/d" "src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx"
```

**Aceitacao:**

- [ ] Grep por `force-dynamic` retorna zero resultados em `src/app/api`
- [ ] Build passa sem erros
- [ ] Nenhum comportamento de rendering muda (dinamico antes, dinamico depois)

**Como testar:**

```bash
grep -r "force-dynamic" src/app --include="*.ts" --include="*.tsx"
# Esperado: nenhuma ocorrencia
npm run build
# Esperado: build limpo
```

**Tempo:** 30min
**Dependencia:** nenhuma (pode executar independente do T1)

---

## 🟢 Fase 2: Performance (1-2h)

### T3: Adicionar `"use cache"` em dados publicos (1-2h)

**Problema:** Billing plans e config publica buscados do banco a cada request sem necessidade.

**Localizacao:**

- `src/features/billing/services/billing-plan-catalog.service.ts` > `listPublicBillingPlans`
- `src/app/api/v1/billing/plans/route.ts`
- `src/features/billing/services/billing-plan-catalog.service.ts` > mutacoes admin (para invalidacao)

**O que fazer:**

1. Adicionar `"use cache"` na funcao `listPublicBillingPlans`:

```ts
import { cacheLife, cacheTag } from "next/cache"

export async function listPublicBillingPlans(input?: BillingPlanPublicQuery) {
  "use cache"
  cacheLife("hours")
  cacheTag("billing-plans")

  // logica existente
}
```

2. Adicionar `revalidateTag` nas mutacoes que alteram planos (criar, atualizar, ativar/desativar):

```ts
import { revalidateTag } from "next/cache"

export async function updateBillingPlanService(input: unknown) {
  // ... logica existente
  revalidateTag("billing-plans")
  return { data: updated }
}
```

3. Verificar se existem outros candidatos obvios: config de app, listas de status, lookup tables.

**Aceitacao:**

- [ ] `listPublicBillingPlans` tem `"use cache"` + `cacheLife("hours")` + `cacheTag("billing-plans")`
- [ ] Mutacoes de billing plan chamam `revalidateTag("billing-plans")`
- [ ] Apos criar/editar plano, nova listagem reflete a mudanca (cache invalidado)
- [ ] Build passa sem erros

**Como testar:**

```bash
# Verificar que endpoint retorna dados
curl http://localhost:3000/api/v1/billing/plans
# Esperado: lista de planos com 200

# Via admin: alterar um plano
# Esperado: proxima chamada ao GET retorna plano atualizado (cache invalidado)
```

**Tempo:** 1-2h
**Dependencia:** T1 (env.ts deve existir para que services funcionem corretamente)

---

## 📊 Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 - env.ts | 2-3h | Nenhum |
| T2 - force-dynamic | 30min | Nenhum |
| T3 - use cache | 1-2h | T1 |

**Total:** 4-6h

---

**Status:** Pronto para execucao
