# Diagnostic: PRD-003 Performance

**Data:** 2026-05-18 | **Auditoria:** automatizada + manual

---

## 🔴 Critico

### D-01: Navegacoes `router.push()` sem feedback visual (UX)

**Problema:** Usuario clica, nada acontece visivelmente por 100-800ms, parece que nao funcionou.

**Localizacoes:**

```
features/dashboard/components/layout/topbar.tsx:82
  handleAppModeNavigation() -> router.push(targetPath)
  — sem disabled, sem spinner, sem transition

features/dashboard/components/layout/topbar.tsx:88
  handleSelectProject() -> router.push(`/${org}/${slug}`)
  — sem disabled, sem spinner

features/dashboard/components/layout/topbar.tsx:159
  onClick -> router.push(...)
  — sem disabled

features/dashboard/components/sidebar/user-dropdown-menu.tsx:63,71,82,88
  handleNavigate(), handleSignOut(), handleSelectProject()
  — multiplos router.push sem qualquer indicador

app/(auth)/sign-up/page.tsx:~166
  router.push(nextPath) apos signUp + setup async sequencial
  — sem indicador de "criando sua conta..."

features/onboarding/components/welcome-onboarding-form.tsx:~152
  router.replace() apos async company lookup + cookie + auth refresh
  — form aparentemente trava sem feedback de progresso
```

**Fix:** `useTransition` para navagacoes simples + `isPending` state para acoes async. Ver T1.

---

### D-02: 31 rotas dashboard sem `loading.tsx`

**Problema:** Navegacao para qualquer dessas paginas mostra tela em branco ate Server Component completar (100ms-2s dependendo de queries).

**Rotas afetadas:**
```
(dashboard)/[org]/[project]/analytics/
(dashboard)/[org]/[project]/billing/
(dashboard)/[org]/[project]/campaigns/
(dashboard)/[org]/[project]/campaigns/[campaignId]/
(dashboard)/[org]/[project]/campaigns/new/
(dashboard)/[org]/[project]/campaigns/opt-outs/
(dashboard)/[org]/[project]/catalog/
(dashboard)/[org]/[project]/equipe/
(dashboard)/[org]/[project]/item-categories/
(dashboard)/[org]/[project]/items/
(dashboard)/[org]/[project]/leads/
(dashboard)/[org]/[project]/meta-ads/
(dashboard)/[org]/[project]/meta-ads/campaigns/
(dashboard)/[org]/[project]/minha-conta/
(dashboard)/[org]/[project]/sales/
(dashboard)/[org]/[project]/settings/profile/
(dashboard)/[org]/[project]/settings/organization/
(dashboard)/[org]/[project]/settings/audit/
(dashboard)/[org]/[project]/settings/audit-logs/
(dashboard)/[org]/[project]/settings/integrations/
(dashboard)/[org]/[project]/settings/meta-ads/
(dashboard)/[org]/[project]/settings/subscription/
(dashboard)/[org]/[project]/settings/team/
(dashboard)/[org]/[project]/settings/whatsapp/
(dashboard)/[org]/[project]/settings/pipeline/
(dashboard)/[org]/[project]/settings/webhooks/whatsapp/
(dashboard)/[org]/[project]/tickets/
(dashboard)/[org]/[project]/whatsapp/
(dashboard)/[org]/[project]/whatsapp/audiences/
(dashboard)/[org]/[project]/whatsapp/inbox/
(dashboard)/[org]/[project]/projects/[projectId]/  ← tem loading.tsx mas pode melhorar
(auth)/reset-password/
(auth)/forgot-password/
```

**Fix:** Criar `loading.tsx` em cada uma. Usar componente generico `<DashboardPageSkeleton />`. Ver T2.

---

### D-03: N+1 em ticket stages

**Arquivo:** `src/features/tickets/services/ensure-ticket-stages.ts:6`

```ts
// Problema: N queries sequenciais
for (const stage of DEFAULT_TICKET_STAGES) {
  await db.ticketStage.upsert({ ... })
}

// Fix: paralelo
await Promise.all(
  DEFAULT_TICKET_STAGES.map((stage) => db.ticketStage.upsert({ ... }))
)
```

---

### D-04: N+1 de slug com loop de ate 100 queries

**Arquivo:** `src/features/organizations/services/organization-management.service.ts:41`

```ts
// Problema: 1 query por iteracao ate encontrar slug livre
for (let index = 0; index < 100; index += 1) {
  const existing = await prisma.organization.findFirst({ where: { slug: candidate } })
  if (!existing) return candidate
}

// Fix: buscar todos candidatos de uma vez
const candidates = generateCandidateSlugs(base, 10) // gera ['abc', 'abc-1', 'abc-2', ...]
const taken = await prisma.organization.findMany({
  where: { slug: { in: candidates } },
  select: { slug: true },
})
const takenSet = new Set(taken.map(o => o.slug))
return candidates.find(c => !takenSet.has(c)) ?? `${base}-${Date.now()}`
```

---

## 🟡 Moderado

### D-05: `images: { unoptimized: true }` em next.config.ts

**Arquivo:** `next.config.ts:8`

```ts
images: {
  unoptimized: true,  // desabilita resize, WebP, lazy-load otimizado
}
```

**Impacto:** LCP maior, payloads maiores, sem WebP automatico.

**Fix:** Remover ou substituir por `remotePatterns` se imagens sao de CDN externo. Ver T5.

---

### D-06: `<img>` em vez de `<Image>` (next/image)

**Arquivos:**
```
app/(auth)/layout.tsx       — 2 logos como <img>
features/billing/components/billing-status.tsx — 1 img
features/whatsapp/components/settings/instance-card-detail.tsx — 1 img
```
`features/billing/components/checkout-pix-qrcode.tsx` — QR code dinamico, aceitavel como img.

**Fix:** Migrar para `<Image>` com `width`/`height` ou `fill`. Ver T5.

---

### D-07: Sequential awaits paralelizaveis

**Arquivo:** `src/features/billing/services/payment.service.ts:87`

Dois fetches independentes executados em sequencia. Usar `Promise.all`.

**Arquivo:** `src/features/whatsapp/services/whatsapp-chat.service.ts:85`

Mesmo padrao. Usar `Promise.all`.

**Arquivo:** `app/(dashboard)/.../settings/organization/page.tsx:13-30`

```ts
// Atual: sequencial
const access = await requireWorkspacePageAccess(...)
const org = await getOrganizationMe(...)
const company = await getOrganizationCompany(orgId) // depende de org.id

// Mas access + org sao independentes:
const [access, org] = await Promise.all([
  requireWorkspacePageAccess(...),
  getOrganizationMe(...),
])
const company = org ? await getOrganizationCompany(org.id) : null
```

---

### D-08: Skeleton screens ausentes ou genéricas

**Localizacoes com fallback inadequado:**
```
Suspense na maioria das paginas usa spinner generico (<Loader2> animado)
em vez de skeleton com layout fiel ao conteudo da pagina
```

**Excecoes com bom padrao:**
- `settings/billing` — usa `<BillingPageSkeleton />` ✓
- `sales` — usa `<TableSkeleton />` ✓
- `account` — usa `<AccountPageSkeleton />` ✓

**Fix:** Criar skeleton por feature. Ver T3.

---

## 🟢 Menor

### D-09: sales-list sem virtualizacao

**Arquivo:** `src/features/sales/components/sales-list.tsx`

`react-virtuoso` ja instalado. Grandes listas de vendas renderizam todos os items no DOM.

---

### D-10: Fallback de Suspense no reset-password

**Arquivo:** `app/(auth)/reset-password/page.tsx`

```tsx
<Suspense fallback={<div>Carregando...</div>}>
```

Fallback texto puro. Poderia ser skeleton inline simples.

---

## Resumo por Fase

| Task | Categoria | Severidade | Estimativa |
|------|-----------|------------|-----------|
| T1: Clique imediato | UX Percebida | 🔴 Critico | 2-3h |
| T2: loading.tsx dashboard | UX Percebida | 🔴 Critico | 2-3h |
| T3: Skeleton screens | UX Percebida | 🟡 Moderado | 2-3h |
| T4: Fix N+1 queries | Performance Real | 🔴 Critico | 1-2h |
| T5: Images otimizadas | Performance Real | 🟡 Moderado | 1h |
| T6: Promise.all sequential | Performance Real | 🟡 Moderado | 1h |
