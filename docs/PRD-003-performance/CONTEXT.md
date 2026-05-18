# Context: Performance do Sistema

**Ultima atualizacao:** 2026-05-18

---

## 📌 Definicao

Este PRD cobre melhorias de performance mensuravelmente impactantes no projeto. Nao cobre refatoracao arquitetural (PRD-001, PRD-002) nem novas features.

**O que e:**

- Reducao de latencia em queries de banco de dados
- Reducao de payload transferido por request
- Reducao de trabalho desnecessario no servidor (N+1, sequential awaits)
- Melhoria de rendering strategy (Server Components, cache)
- Correcao de configuracoes com impacto direto em LCP e CLS

**O que NAO e:**

- Mudanca de ORM ou banco de dados
- Mudanca de stack de autenticacao
- Mudanca de provedor de hospedagem

---

## 📁 Estado Atual: Inventario de Problemas

### Configuracao

| Item | Estado atual | Impacto |
|------|-------------|---------|
| `images: { unoptimized: true }` em `next.config.ts` | ativo | LCP, payload de imagens sem resize/compress |
| `use cache` directive | nenhum uso em todo projeto | sem cache granulado em Server Components |
| Cache-Control em API routes de leitura | ausente | cada request bate no banco mesmo para dados estaveis |
| Partial Prerendering (PPR) | desativado | atraso no TTI; shell dinamico ao inves de estatico |

### Queries de banco de dados

| Problema | Localizacao | Tipo |
|----------|------------|------|
| `for...of` com `await` sequencial (N+1) | `tickets/services/ensure-ticket-stages.ts:6` | N+1 |
| Loop de ate 100 queries sequenciais para encontrar slug disponivel | `organizations/services/organization-management.service.ts:41` | N+1 severo |
| `findMany` sem `select:` (retorna model completo) | 20+ arquivos em `src/app/api/v1/` | over-fetching |
| `include` com 3 niveis de nesting | `billing/services/billing-auto-upgrade.service.ts:30` | over-fetching |
| `await` sequencial onde `Promise.all` bastaria | `billing/services/payment.service.ts:87`, `whatsapp/services/whatsapp-chat.service.ts:85` | latencia desnecessaria |

**Detalhe do N+1 em ticket stages:**

```ts
// src/features/tickets/services/ensure-ticket-stages.ts:6
// Problema: 1 query por stage, executadas em sequencia
for (const stage of DEFAULT_TICKET_STAGES) {
  await db.ticketStage.upsert({ ... })  // N queries sequenciais
}

// Correto: executar em paralelo
await Promise.all(
  DEFAULT_TICKET_STAGES.map((stage) => db.ticketStage.upsert({ ... }))
)
```

**Detalhe do N+1 de slug (ate 100 queries):**

```ts
// src/features/organizations/services/organization-management.service.ts:41
// Problema: loop de 0 a 99, cada iteracao faz 1 query no banco ate encontrar slug livre
for (let index = 0; index < 100; index += 1) {
  const existingOrganization = await prisma.organization.findFirst({
    where: { slug: candidate },
    select: { id: true },
  })
  if (!existingOrganization) return candidate
}

// Correto: buscar todos os slugs candidatos de uma vez
const existingSlugs = await prisma.organization.findMany({
  where: { slug: { in: candidates } },
  select: { slug: true },
})
const taken = new Set(existingSlugs.map(o => o.slug))
return candidates.find(c => !taken.has(c)) ?? fallback
```

### Rendering Strategy

| Arquivo | Problema | Impacto |
|---------|---------|---------|
| `src/app/(dashboard)/[organizationSlug]/[projectSlug]/page-client.tsx` | `"use client"` com `useQuery` para summary — poderia ser Server Component | waterfall client-side |
| `src/app/(dashboard)/[organizationSlug]/[projectSlug]/sales/page.tsx` | `"use client"` na pagina raiz | sem SSR de dados iniciais |
| `src/app/(dashboard)/[organizationSlug]/[projectSlug]/tickets/page.tsx` | `"use client"` na pagina raiz | sem SSR de dados iniciais |
| `src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/[campaignId]/page.tsx` | `"use client"` na pagina raiz | sem SSR de dados iniciais |

Nenhuma pagina usa `'use cache'` ou `cacheLife()` do Next.js 16+.

### Virtualizacao de listas

| Arquivo | Situacao |
|---------|---------|
| `src/features/settings/components/audit-logs-table.tsx` | react-virtuoso instalado e em uso |
| `src/features/dashboard/components/crud/crud-card-view.tsx` | react-virtuoso em uso |
| `src/features/dashboard/components/crud/crud-list-view.tsx` | react-virtuoso em uso |
| `src/features/sales/components/sales-list.tsx` | `.map()` sem virtualizacao ou paginacao |

`react-virtuoso@^4.5.0` ja esta instalado. Falta aplicar em sales-list e outros listados futuramente.

---

## 🔄 Fluxo de Rendering Atual vs Alvo

### Atual

```txt
Browser
  -> Request URL
  -> Server renderiza pagina (mas com "use client" na raiz = sem SSR util)
  -> Envia HTML basico
  -> Browser hidrata
  -> TanStack Query dispara requests para API
  -> Banco executa queries
  -> Dados chegam, pagina renderiza
```

### Alvo

```txt
Browser
  -> Request URL
  -> Server renderiza Server Component com dados (query no banco direto)
  -> Aplica 'use cache' onde dados sao estaveis
  -> Envia HTML completo com dados
  -> Browser hidrata apenas componentes interativos
  -> TanStack Query cuida de mutacoes e atualizacoes pos-hidratacao
```

---

## 🔗 Integracoes Relevantes

- **Prisma ORM**: acesso ao banco via `src/lib/db/prisma.ts`
- **TanStack Query**: gerencia estado client, refetch, invalidacao
- **Next.js 16+**: suporta `'use cache'`, `cacheLife()`, `cacheTag()`, `revalidateTag()`
- **next/image**: suporte nativo a resize, WebP, lazy load — desabilitado atualmente

---

## 📊 Resumo de Severidade (prevista para DIAGNOSTIC.md do PRD-003)

| Categoria | Problemas | Severidade |
|-----------|-----------|------------|
| `images: unoptimized` | 1 config | 🔴 Critico |
| N+1 em ticket stages | 1 service | 🔴 Critico |
| N+1 em slug organizations (loop 100) | 1 service | 🔴 Critico |
| Over-fetching sem `select:` | 20+ queries | 🟡 Moderado |
| Sequential awaits paralelizaveis | 2-3 services | 🟡 Moderado |
| Pages com `"use client"` desnecessario | 4+ pages | 🟡 Moderado |
| Sem `use cache` em nenhuma pagina | todo projeto | 🟡 Moderado |
| sales-list sem virtualizacao | 1 componente | 🟢 Menor |

---

## 🎭 Eixo B: Performance Percebida (UX)

Este eixo foi adicionado apos auditoria detalhada e feedback do usuario.

### Problema Raiz: Clique sem Feedback

No Next.js App Router, `router.push()` inicia pre-fetch + transicao antes de navegar. Durante 100-800ms o usuario nao ve nada. Resultado: duplo-clique, confusao, sensacao de app lento.

### Inventario de Navegacoes sem Feedback

| Arquivo | Linha | Problema |
|---------|-------|---------|
| `features/dashboard/components/layout/topbar.tsx` | 82, 88 | `router.push()` puro em troca de projeto/modo |
| `features/dashboard/components/layout/topbar.tsx` | 159 | `router.push()` sem disabled/spinner |
| `features/dashboard/components/sidebar/user-dropdown-menu.tsx` | 63, 71, 82, 88 | `router.push()` em multiplos handlers sem feedback |
| `app/(auth)/sign-up/page.tsx` | ~166 | navegacao pos-signup sem indicador de progresso |
| `features/onboarding/components/welcome-onboarding-form.tsx` | ~152 | redirect pos-onboarding sem feedback claro |
| `features/campaigns/components/campaigns-page.tsx` | varias | router.push sem transition indicator |

### Loading.tsx Ausente (31 rotas dashboard)

Quando usuario navega para uma nova pagina, Next.js mostra tela em branco ate o Server Component completar. `loading.tsx` e mostrado IMEDIATAMENTE enquanto aguarda — percebe-se como pagina instantanea.

**Rotas sem loading.tsx:**
- `analytics`, `billing`, `campaigns`, `campaigns/[id]`, `campaigns/new`, `campaigns/opt-outs`
- `catalog`, `equipe`, `item-categories`, `items`, `leads`
- `meta-ads`, `meta-ads/campaigns`, `minha-conta`, `sales`
- `settings/profile`, `settings/organization`, `settings/audit`, `settings/audit-logs`
- `settings/integrations`, `settings/meta-ads`, `settings/subscription`
- `settings/team`, `settings/whatsapp`, `settings/pipeline`, `settings/webhooks/whatsapp`
- `tickets`, `whatsapp`, `whatsapp/audiences`, `whatsapp/inbox`
- `[projectId]` (projeto individual)
- Auth: `reset-password`, `forgot-password`

### Skeleton Screens

Apenas 7 Suspense boundaries no projeto. Fallbacks existentes usam spinner simples em vez de skeleton com layout fiel ao conteudo.

**Disponivel:** `shadcn/ui Skeleton` ja importado em alguns arquivos (`@/components/ui/skeleton`).

**Patterns existentes para reusar:**
- `BillingPageSkeleton` — em `features/billing/components/billing-page-skeleton`
- `AccountPageSkeleton` — em `features/account/components/account-page-skeleton`
- `TableSkeleton` — em `features/dashboard/components/states/table-skeleton`

---

## 📝 Resumo para Implementacao

- Fixes de N+1 sao cirurgicos: 2 arquivos, impacto imediato mensuravel.
- `select:` em repositories e gratuito e deve ser regra no PRD-002 T2.
- `images: { unoptimized: true }` deve ser removido ou substituido por dominios permitidos.
- Server Components exigem analise caso a caso: nem toda pagina com `"use client"` pode ser convertida sem refatorar o componente raiz.
- `use cache` e a maior alavanca de performance para dados semi-estaveis (dashboards, listas de configuracao).
- Feedback de clique imediato e a maior alavanca de UX percebida — resolve o problema reportado de duplo-clique e sensacao de app lento.
- `loading.tsx` + skeleton sao o par perfeito: loading.tsx e mostrado durante pre-fetch, skeleton mantem layout fiel enquanto dados chegam.
