# Tasks: PRD-003 Performance e UX de Carregamento

**Data:** 2026-05-18 | **Status:** Concluído | **Total Tasks:** 6 | **Estimado:** 9-13h

---

## Fase 1 — UX Percebida (maior impacto para o usuario)

### T1: Feedback instantaneo em cliques e navegacoes (2-3h)

**Problema:** Botoes e links de navegacao nao dao nenhum feedback visual durante 100-800ms enquanto o Next.js pre-faz o fetch da rota destino ou a acao async executa. Usuario clica multiplas vezes achando que nao funcionou.

**Principio:** Todo clique que dispara acao async ou navegacao deve mostrar feedback em < 50ms.

---

#### 1a. Padrao para navegacoes simples (router.push sem async)

Usar `useTransition` do React. `isPending` fica `true` imediatamente no clique, antes mesmo do fetch terminar.

```tsx
// Padrao recomendado para componentes de navegacao
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

const [isPending, startTransition] = useTransition()
const router = useRouter()

const handleNavigate = (path: string) => {
  startTransition(() => router.push(path))
}

// No botao/item:
<Button disabled={isPending} onClick={() => handleNavigate('/algum-path')}>
  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon />}
  Texto
</Button>
```

**Onde aplicar (D-01 do DIAGNOSTIC):**

1. `features/dashboard/components/layout/topbar.tsx`
   - `handleAppModeNavigation()` — usar `useTransition`
   - `handleSelectProject()` — usar `useTransition`, mostrar spinner no item selecionado
   - Botao de settings (linha 159) — `useTransition`

2. `features/dashboard/components/sidebar/user-dropdown-menu.tsx`
   - `handleNavigate()` — `useTransition`
   - `handleSignOut()` — ja e async, adicionar `isPending` state + disable no item

3. Qualquer `<Link>` que o usuario reportar como "lento" pode ganhar `useTransition` com handler

---

#### 1b. Padrao para acoes async (API calls, mutations)

Ja e bem coberto com `isPending` do TanStack Query. Verificar e consolidar nos pontos fracos:

```tsx
// Padrao correto (ja usado em campaign-builder — replicar nos demais)
<Button
  disabled={mutation.isPending}
  onClick={() => mutation.mutate(data)}
>
  {mutation.isPending ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
  ) : (
    <>Salvar</>
  )}
</Button>
```

**Verificar e corrigir onde falta:**
- Formularios de settings (perfil, organizacao, integracao, whatsapp)
- Botoes de delete/archive em qualquer CRUD
- Botoes de submit em drawers/dialogs

---

#### 1c. Sign-out com indicador de progresso

```tsx
// topbar.tsx e user-dropdown-menu.tsx
const [isSigningOut, setIsSigningOut] = useState(false)

const handleSignOut = async () => {
  setIsSigningOut(true)
  try {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push('/sign-in'),
      },
    })
  } finally {
    setIsSigningOut(false)
  }
}

// No item do menu:
<DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut}>
  {isSigningOut
    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    : <LogOut className="mr-2 h-4 w-4" />
  }
  {isSigningOut ? 'Saindo...' : 'Sair'}
</DropdownMenuItem>
```

---

#### 1d. Welcome onboarding form

```tsx
// features/onboarding/components/welcome-onboarding-form.tsx
// Ja usa useTransition — garantir que o botao de submit esteja disabled={isPending}
// e que haja texto de progresso ("Configurando sua conta...")
```

---

### T2: `loading.tsx` para as 31 rotas dashboard (2-3h)

**Problema:** Navegacao para qualquer rota sem `loading.tsx` mostra tela em branco ate o Server Component completar.

**Solucao:** Criar componente generico `DashboardPageSkeleton` e um `loading.tsx` padrao.

---

#### Passo 1: Criar componente base

```tsx
// src/features/dashboard/components/states/dashboard-page-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header da pagina */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Conteudo — cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### Passo 2: Criar `loading.tsx` em cada rota

Arquivo padrao (copiar para todas as 31 rotas):

```tsx
// src/app/(dashboard)/[organizationSlug]/[projectSlug]/ROTA/loading.tsx
import { DashboardPageSkeleton } from '@/features/dashboard/components/states/dashboard-page-skeleton'

export default function Loading() {
  return <DashboardPageSkeleton />
}
```

**Lista de arquivos a criar** (31 + 2 auth):

```
src/app/(dashboard)/[organizationSlug]/[projectSlug]/analytics/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/billing/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/[campaignId]/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/new/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/campaigns/opt-outs/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/catalog/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/equipe/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/item-categories/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/items/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/leads/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/meta-ads/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/meta-ads/campaigns/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/minha-conta/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/sales/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/profile/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/organization/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/audit/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/audit-logs/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/integrations/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/meta-ads/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/subscription/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/team/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/pipeline/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/webhooks/whatsapp/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/tickets/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/audiences/loading.tsx
src/app/(dashboard)/[organizationSlug]/[projectSlug]/whatsapp/inbox/loading.tsx
src/app/(auth)/reset-password/loading.tsx
src/app/(auth)/forgot-password/loading.tsx
```

---

### T3: Skeleton screens para paginas-chave (2-3h)

**Problema:** Paginas com Suspense usam fallback generico (`<Loader2>` spinners) que nao preservam o layout, causando layout shift na hidratacao.

**Paginas prioritarias para skeleton customizado:**

1. **Campaigns list** (`features/campaigns/components/`) — skeleton de cards de campanha
2. **Leads** (`features/leads/components/`) — skeleton de tabela com avatar + texto
3. **Dashboard principal** — skeleton de metricas (cards numericos)
4. **Settings pages** — skeleton de formulario (labels + inputs)

**Padrao de skeleton de tabela (reusar/adaptar `TableSkeleton` existente):**

```tsx
// src/features/dashboard/components/states/table-skeleton.tsx (ja existe — checar e expandir)
export function TableSkeleton({ rows = 8, cols = 4 }) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-4 border-b">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-48' : j === cols - 1 ? 'w-16 ml-auto' : 'w-32'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
```

**Padrao de skeleton de formulario:**

```tsx
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="space-y-6 max-w-lg">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-28" />
    </div>
  )
}
```

---

## Fase 2 — Performance Real (servidor)

### T4: Fix N+1 queries (1-2h)

**Problema D-03:** `ensure-ticket-stages.ts` usa `for...of await` sequencial.

```ts
// ANTES (N queries sequenciais)
for (const stage of DEFAULT_TICKET_STAGES) {
  await db.ticketStage.upsert({ where: ..., create: stage, update: stage })
}

// DEPOIS (N queries paralelas)
await Promise.all(
  DEFAULT_TICKET_STAGES.map((stage) =>
    db.ticketStage.upsert({ where: ..., create: stage, update: stage })
  )
)
```

**Problema D-04:** `organization-management.service.ts` usa loop de ate 100 queries.

```ts
// ANTES
for (let i = 0; i < 100; i++) {
  const existing = await prisma.organization.findFirst({ where: { slug: candidate } })
  if (!existing) return candidate
  candidate = `${base}-${i + 1}`
}

// DEPOIS
function generateCandidates(base: string, count = 10): string[] {
  return [base, ...Array.from({ length: count - 1 }, (_, i) => `${base}-${i + 1}`)]
}

const candidates = generateCandidates(slugBase)
const taken = await prisma.organization.findMany({
  where: { slug: { in: candidates } },
  select: { slug: true },
})
const takenSet = new Set(taken.map(o => o.slug))
return candidates.find(c => !takenSet.has(c)) ?? `${slugBase}-${Date.now()}`
```

---

### T5: Corrigir `images: { unoptimized: true }` e migrar `<img>` (1h)

**Problema D-05 e D-06.**

```ts
// next.config.ts — REMOVER unoptimized: true
// Substituir por remotePatterns se houver imagens de CDN externo:
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.cloudinary.com' },
    { protocol: 'https', hostname: '**.amazonaws.com' },
    // adicionar hosts necessarios
  ],
},
```

**Migrar `<img>` para `<Image>`:**
- `app/(auth)/layout.tsx` — logos do lado esquerdo da tela
- `features/billing/components/billing-status.tsx`
- `features/whatsapp/components/settings/instance-card-detail.tsx`

---

### T6: Paralelizar sequential awaits (1h)

**Problema D-07.**

```ts
// billing/services/payment.service.ts:87
// whatsapp/services/whatsapp-chat.service.ts:85
// settings/organization/page.tsx:13-30

// Padrao:
const [resultA, resultB] = await Promise.all([
  fetchA(),
  fetchB(),
])
```

Verificar cada um individualmente — alguns podem ter dependencia de dados (nao paralelizaveis).

---

## Fase 3 — Otimizações Refinadas (2-3h)

### T7: Virtualização e Listas Longas (1h)
**Problema D-09:** A `sales-list.tsx` renderiza centenas de itens de uma vez, pesando o DOM.
- **Ação:** Implementar `react-virtuoso` (já instalado) na `sales-list.tsx`.
- **Referência:** Ver `audit-logs-table.tsx` para exemplo de implementação.

### T8: Piloto de `use cache` (Next.js 16+) (1h)
**Problema:** Dados estáticos (ex: lista de planos, categorias) são buscados do banco em todo request.
- **Ação:** Adicionar a diretiva `'use cache'` e definir `cacheLife('minutes')` em funções de leitura de configurações.
- **Onde:** `billing/services/get-plans.ts` (ou equivalente).

---

## Fase 4 — Next.js Power User (Experiência Premium) (4-6h)

Para competir com plataformas globais em termos de velocidade, a aplicação precisa parecer "instantânea", escondendo a latência da rede e do banco de dados sempre que possível.

### T9: Streaming Granular com Suspense (2h)
**Problema:** Atualmente, `Suspense` bloqueia páginas inteiras. Se um widget de dashboard demora, o usuário não vê os que já estão prontos.
- **Ação:** Identificar dashboards e páginas pesadas (ex: `/analytics`, `/dashboard`). Isolar os componentes mais lentos em seus próprios Server Components e envolvê-los em `<Suspense fallback={<CardSkeleton />}>` individualmente.
- **Resultado Esperado:** O shell da página e widgets rápidos carregam quase instantaneamente, widgets pesados carregam em paralelo.

### T10: Migração para Server Actions (2h)
**Problema:** O projeto não usa `'use server'`. Todas as requisições dependem de `fetch` client-side para `/api/`, aumentando a complexidade da rede e impedindo atualizações otimistas fluidas.
- **Ação:** Implementar o padrão de Server Actions definido no `SKILL.md` (`next-feature-architecture`). Iniciar migrando mutações de configurações (Settings) e formulários pequenos.
- **Onde:** `src/features/settings/actions/` e substituição de `fetch` nos componentes clientes.

### T11: Optimistic Updates (1h)
**Problema:** Ações simples como favoritar, marcar como lido ou arquivar dependem do tempo de ida e volta do servidor para refletir na UI.
- **Ação:** Utilizar `useOptimistic` (Next.js/React 19) em conjunto com Server Actions para atualizar a UI em milissegundos antes da confirmação do banco de dados.
- **Onde:** Botões de ação rápida em listas (ex: mudar estágio de ticket, ativar/desativar campanhas).

### T12: Ativar Partial Prerendering (PPR) (Piloto) (1-2h)
**Problema:** Cada rotação do dashboard exige SSR (Server-Side Rendering) completo.
- **Ação:** Habilitar `ppr: 'incremental'` no `next.config.ts`. Adicionar a diretiva `export const experimental_ppr = true` em layouts principais (TopBar, SideBar).
- **Atenção:** Como é uma feature experimental do Next.js 15, aplicar primeiro em uma rota menos crítica para validar compatibilidade.

---

## 🧪 Verificação e Métricas

### Critérios de Aceitação Técnica
- [ ] **Nenhum `for...of await`** em arquivos de `/services`.
- [ ] **Imagens Otimizadas:** Inspecione uma imagem no browser; ela deve ser servida como `.webp` ou `.avif` (não `.png`/`.jpg` originais).
- [ ] **Feedback em <50ms:** Todo clique em item de menu/botão de ação deve resultar em mudança de estado visual (spinner, fade, disabled).

### Riscos Monitorados
| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Imagens quebrando | Alto | Validar `remotePatterns` no `next.config.ts` para S3/Cloudinary. |
| Race Conditions em `Promise.all` | Médio | Garantir que os awaits paralelos não dependam um do outro. |
| Cache obsoleto com `use cache` | Médio | Usar `revalidateTag` em mutações que alteram dados cacheados. |
