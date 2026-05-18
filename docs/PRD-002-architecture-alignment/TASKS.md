# Tasks: PRD-002 Architecture Alignment

**Data:** 2026-05-18 | **Status:** Draft | **Total Tasks:** 7 | **Estimado:** 3-5 dias

---

## Regra Global de Fechamento

Toda task segue checklist obrigatorio de encerramento:

- [ ] `npm run lint` executado sem erro
- [ ] `npm run build` executado sem erro
- [ ] `git commit` realizado com escopo da task

Padrao de commit:

```bash
git commit -m "refactor(<dominio>): <T-id> <resumo>"
```

---

## 🔴 Fase 1: Criticos (2-3 dias)

### T1: Adicionar `import "server-only"` em services e repositories (2h)

**Problema:** 97 services e 4 repositories em `src/features/` sem `import "server-only"`. Bundler pode incluir codigo server no bundle client.

**Localizacao:** `src/features/*/services/*.ts` e `src/features/*/repositories/*.ts`

**O que fazer:**

1. Executar script para adicionar `import "server-only"` na linha 1 dos arquivos afetados:

```bash
# Adicionar server-only em services
find src/features -path "*/services/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then
    sed -i '' '1s/^/import "server-only"\n/' "$f"
  fi
done

# Adicionar server-only em repositories
find src/features -path "*/repositories/*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | while read f; do
  if ! grep -q "server-only" "$f"; then
    sed -i '' '1s/^/import "server-only"\n/' "$f"
  fi
done
```

2. Executar `npm run build`.
3. Para cada erro de build do tipo `"You're importing a component that needs "server-only"...`: identificar o componente client que importa o service e corrigir o import (usar mutation/query em vez de service diretamente).
4. Repetir build ate passar sem erros.

**Aceitacao:**

- [ ] Todos os arquivos em `src/features/*/services/*.ts` tem `import "server-only"` na linha 1
- [ ] Todos os arquivos em `src/features/*/repositories/*.ts` tem `import "server-only"` na linha 1
- [ ] `npm run build` passa sem erros de boundary
- [ ] `npm run lint` passa

**Como testar:**

```bash
# Verificar se ficou algum arquivo sem server-only
find src/features -path "*/services/*.ts" ! -name "*.test.*" | xargs grep -rL "server-only"
find src/features -path "*/repositories/*.ts" ! -name "*.test.*" | xargs grep -rL "server-only"
# Esperado: nenhuma saida (lista vazia)
```

**Tempo:** 2h

---

### T2: Remover `prisma` direto de `src/app/` (2-3 dias)

**Problema:** 20 arquivos em `src/app/api/` e `src/app/(dashboard)/`, `src/app/(public)/` importam `prisma` diretamente, quebrando o fluxo de camadas.

**Localizacao:** lista completa no DIAGNOSTIC.md, secao "Problema 2"

**O que fazer por arquivo:**

Para cada arquivo afetado:

1. Identificar o dominio responsavel (ex: `billing`, `whatsapp`, `projects`).
2. Verificar se ja existe service ou repository no dominio para aquela operacao.
3. Se existir: remover query da route e chamar o service/repository existente.
4. Se nao existir: criar `[operacao].repository.ts` ou `[operacao].service.ts` no dominio correto com `import "server-only"`, mover a logica, e chamar da route.
5. Route deve apenas: autenticar, chamar service, retornar resposta.

**Regra de performance obrigatoria nesta task:**

Todo repository criado ou editado nesta task deve ter `select:` explicito em todas as queries. Nunca retornar o model completo quando apenas alguns campos sao usados. Isso elimina over-fetching sem custo adicional de implementacao.

```ts
// ERRADO - retorna todas as colunas da subscription
const subscription = await prisma.billingSubscription.findUnique({
  where: { organizationId },
})

// CORRETO - retorna apenas o que a route precisa
const subscription = await prisma.billingSubscription.findUnique({
  where: { organizationId },
  select: {
    id: true,
    status: true,
    isActive: true,
    expiresAt: true,
    paymentMethod: true,
  },
})
```

Regra de performance obrigatoria para N+1: se o repository fizer multiplas queries independentes, usar `Promise.all`. Nunca usar `await` sequencial para queries que nao dependem uma da outra.

```ts
// ERRADO - sequencial desnecessario
const org = await prisma.organization.findUnique(...)
const plan = await prisma.billingPlan.findFirst(...)

// CORRETO - paralelo
const [org, plan] = await Promise.all([
  prisma.organization.findUnique(...),
  prisma.billingPlan.findFirst(...),
])
```

Exemplo correto apos correcao:

```ts
// src/app/api/v1/billing/subscription/status/route.ts
import { getBillingSubscriptionStatusService } from "@/features/billing/services/get-billing-subscription-status.service"
import { validateFullAccess } from "@/server/auth/validate-organization-access"
import { apiError, apiSuccess } from "@/lib/utils/api-response"

export async function GET(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError("Unauthorized", 403)
  }
  const result = await getBillingSubscriptionStatusService(auth.organizationId)
  return apiSuccess(result)
}
```

**Grupos de execucao (ordem sugerida):**

| Grupo | Arquivos | Tempo |
|-------|----------|-------|
| billing (4 routes) | subscription, subscription/status, subscription/retry, checkout/status | 3-4h |
| whatsapp (7 routes) | campaigns/ab, campaigns/stats, campaigns/add-audience, campaigns/retry-failed, claim-waba, debug, onboarding/phone-number, phone-numbers/profile | 4-6h |
| projects (2 routes) | slug, current | 1-2h |
| cron (2 routes) | campaign-dispatch, ab-winner-dispatch | 1-2h |
| meta-ads (1 route) | connect | 1h |
| onboarding (1 route) | setup | 1-2h |
| pages (2 arquivos) | checkout/page.tsx, layout.tsx | 2-3h |

**Aceitacao:**

- [ ] Nenhum arquivo em `src/app/` importa `@/lib/db/prisma`
- [ ] Cada route delega para service ou repository em `src/features/`
- [ ] Services e repositories criados tem `import "server-only"`
- [ ] Todo repository criado ou editado tem `select:` explicito em todas as queries Prisma
- [ ] Nenhum repository novo usa `await` sequencial para queries independentes (usar `Promise.all`)
- [ ] `npm run build` passa
- [ ] `npm run lint` passa

**Como testar:**

```bash
# Verificar se restou algum import de prisma em src/app/
grep -r "from '@/lib/db/prisma'" src/app --include="*.ts" --include="*.tsx"
# Esperado: nenhuma saida
```

**Tempo:** 2-3 dias

---

## 🟡 Fase 2: Robustez (4-6h)

### T3: Corrigir ou documentar `nanoid` em `features/organizations` (1h)

**Problema:** `nanoid` usada para gerar sufixo de slug em `organization-management.service.ts:33,54`. SKILL.md regra 16 proibe geracao de IDs com bibliotecas externas.

**Localizacao:** `src/features/organizations/services/organization-management.service.ts:2,33,54`

**O que fazer:**

Avaliar se slug de organizacao e considerado "ID" pela regra. Duas opcoes:

**Opcao A:** remover `nanoid` e usar alternativa sem dependencia externa:

```ts
// Sem nanoid - sufixo com timestamp truncado
function uniqueSuffix(length: number): string {
  return Date.now().toString(36).slice(-length)
}

return normalizeSlug(name) || `org-${uniqueSuffix(10)}`
return `${baseSlug}-${uniqueSuffix(6)}`
```

**Opcao B:** se slug nao for ID no sentido da regra, adicionar comentario explicando a excecao:

```ts
// Slug e identificador legivel, nao UUID. nanoid usada para evitar colisao.
// Excecao documentada: PRD-002 T3
import { nanoid } from 'nanoid'
```

A confirmar: qual opcao e preferida pelo time.

**Aceitacao:**

- [ ] Decisao documentada no arquivo ou em SKILL.md
- [ ] Se Opcao A: `nanoid` removido do import e das chamadas
- [ ] `npm run build` e `npm run lint` passam

**Tempo:** 1h

---

### T4: Limpar `features/analytics/index.ts` (30min)

**Problema:** `index.ts` exporta `./services/index`, expondo camada server-only como API publica.

**Localizacao:** `src/features/analytics/index.ts:1`

```ts
export * from './services/index'     // ← remover esta linha
export * from './hooks/use-dashboard-analytics'
```

**O que fazer:**

1. Remover `export * from './services/index'` do `index.ts`.
2. Buscar consumidores que importam de `@/features/analytics` e esperam algo dos services:

```bash
grep -r "from '@/features/analytics'" src --include="*.ts" --include="*.tsx"
```

3. Para cada consumidor que usar services: atualizar o import para apontar diretamente ao service:

```ts
// antes
import { someService } from '@/features/analytics'

// depois
import { someService } from '@/features/analytics/services/some.service'
```

**Aceitacao:**

- [ ] `index.ts` de analytics nao contem `export * from './services'`
- [ ] Todos os consumidores que usavam services via index agora importam diretamente
- [ ] `npm run build` passa

**Tempo:** 30min

---

### T5: Criar `getCurrentUserId` helper (30min)

**Problema:** SKILL.md exige `src/server/auth/get-current-user-id.ts`. Arquivo ausente. Server Actions nao tem padrao unico de autenticacao.

**Localizacao:** `src/server/auth/get-current-user-id.ts` - criar

**O que fazer:**

Criar o arquivo encapsulando `getOrSyncUser` de `server.ts`:

```ts
import "server-only"
import { getOrSyncUser } from "./server"

export async function getCurrentUserId(): Promise<string> {
  const user = await getOrSyncUser()

  if (!user?.id) {
    throw new Error("Nao autorizado")
  }

  return user.id
}
```

Nao e necessario migrar todas as actions para usar este helper agora. O arquivo deve existir para uso nas proximas features e actions criadas.

**Aceitacao:**

- [ ] `src/server/auth/get-current-user-id.ts` existe
- [ ] Exporta `getCurrentUserId(): Promise<string>`
- [ ] Lanca erro se nao autenticado
- [ ] Tem `import "server-only"` na linha 1

**Tempo:** 30min

---

### T6: Definir destino dos servicos legados em `src/services/` (2-3h)

**Problema:** `src/services/audit`, `billing`, `delivery`, `mail` nao foram migrados para `src/features/`.

**Localizacao:** `src/services/audit/`, `src/services/billing/`, `src/services/delivery/`, `src/services/mail/`

**O que fazer por pasta:**

1. `src/services/audit/` - verificar se e infra de auditoria transversal ou especifico de dominio:
   - Se transversal: mover para `src/server/audit/`
   - Se especifico: mover para `src/features/[dominio]/services/`

2. `src/services/billing/` - `src/features/billing/` ja existe:
   - Verificar se ha duplicidade ou complementaridade
   - Mover arquivos de `src/services/billing/` para `src/features/billing/services/`
   - Remover pasta legada

3. `src/services/delivery/` - relacionado a entrega de mensagens (a confirmar):
   - Verificar se pertence a `features/whatsapp`, `features/campaigns` ou infra
   - Mover para destino correto

4. `src/services/mail/` - servico de email:
   - Email e infra transversal. Mover para `src/server/mail/` ou `src/lib/mail/`

**Aceitacao:**

- [ ] `src/services/` nao existe ou esta vazio
- [ ] Cada arquivo movido para destino correto
- [ ] Imports atualizados
- [ ] `npm run build` passa

**Tempo:** 2-3h

---

## 🟢 Fase 3: Melhorias (30min)

### T7: Alinhar documentacao do caminho do banco (30min)

**Problema:** SKILL.md define `src/server/db/db.ts`, projeto usa `src/lib/db/prisma.ts`. Sem impacto funcional.

**Localizacao:** `.agents/skills/next-feature-architecture/SKILL.md`

**O que fazer:**

Opcao A (recomendada): atualizar SKILL.md para refletir caminho real:

```txt
# antes no SKILL.md
server/db/
  db.ts

# depois
lib/db/
  prisma.ts
```

Opcao B: criar `src/server/db/db.ts` como re-export:

```ts
export { prisma as db } from "@/lib/db/prisma"
```

**Aceitacao:**

- [ ] SKILL.md e codigo tem o mesmo caminho referenciado para conexao com banco
- [ ] Sem erros de build

**Tempo:** 30min

---

## 📊 Resumo

| Task | Fase | Tempo | Bloqueador |
|------|------|-------|------------|
| T1: server-only em services/repos | Critico | 2h | Nenhum |
| T2: remover prisma direto de app/ | Critico | 2-3 dias | T1 recomendado antes |
| T3: nanoid em organizations | Moderado | 1h | Decisao de abordagem |
| T4: analytics/index.ts | Moderado | 30min | Nenhum |
| T5: getCurrentUserId helper | Moderado | 30min | Nenhum |
| T6: legados em src/services/ | Moderado | 2-3h | Nenhum |
| T7: caminho DB no SKILL.md | Menor | 30min | Nenhum |

**Total:** 3-5 dias

---

**Status:** Draft pronto para execucao
