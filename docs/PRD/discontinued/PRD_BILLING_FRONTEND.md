# PRD: Billing Frontend — WhaTrack

**Status**: Ready for Implementation
**Depende de**: `PRD_BILLING_SYSTEM.md` (Phase 1–4 completos)
**Owner**: Engineering
**Updated**: 2026-02-28

---

## 1. Escopo

Este PRD cobre exclusivamente a camada de interface do sistema de billing:

1. **Landing** — botões de checkout na `LandingPricing` (já existente, requer ajuste)
2. **Dashboard: Billing Status** — página `/dashboard/billing` com status da subscription
3. **Dashboard: Settings** — seção de cancelamento em Settings
4. **Página de sucesso** — `/billing/success` pós-checkout

Frontend consome os endpoints definidos em `PRD_BILLING_SYSTEM.md`:
- `POST /api/v1/billing/checkout`
- `GET /api/v1/billing/subscription`
- `GET /api/v1/billing/usage`
- `POST /api/v1/billing/cancel`

---

## 2. Convenções do Projeto (obrigatórias)

### Nomenclatura

| Contexto | Padrão | Exemplo |
|----------|--------|---------|
| Landing components | PascalCase | `LandingPricing.tsx` |
| Dashboard components | kebab-case | `billing-status.tsx` |
| Hooks | `use-[resource].ts` | `use-billing-subscription.ts` |
| Types (puros) | `[resource].ts` | `src/types/billing/billing.ts` |
| Zod schemas | `[resource]-schemas.ts` | `src/schemas/billing/billing-schemas.ts` |

### Proibições

- **FORBIDDEN**: `useEffect` ou `useLayoutEffect` — sem exceções
- **FORBIDDEN**: criar `src/components/billing/` (deve ser `src/components/dashboard/billing/`)
- **FORBIDDEN**: lógica de negócio em componentes (delegar a hooks ou Server Components)
- **FORBIDDEN**: fetch direto em componente — usar hooks dedicados ou Server Components

### Estrutura de componentes de dashboard

Toda página de dashboard segue a composição:

```tsx
<PageShell maxWidth="5xl">
  <PageHeader title="..." description="..." icon={Icon} />
  <PageContent>
    <Suspense fallback={<LoadingCard />}>
      <ClientComponent />
    </Suspense>
  </PageContent>
</PageShell>
```

### Server vs. Client Components

- **Server Component** (default): fetch de dados iniciais, sem interatividade
- **Client Component** (`'use client'`): formulários, modais, progress bar, estado local
- Boundary explícita via `Suspense` com fallback

---

## 3. Arquitetura de Arquivos

```
src/
├── app/
│   ├── (public)/billing/
│   │   └── success/
│   │       └── page.tsx                    # /billing/success
│   └── dashboard/
│       └── billing/
│           └── page.tsx                    # /dashboard/billing
│
├── components/
│   ├── landing/
│   │   └── LandingPricing.tsx              # AJUSTAR — adicionar handler de checkout
│   └── dashboard/billing/
│       ├── billing-status.tsx              # Card: plano + status + botão gerenciar
│       ├── usage-progress.tsx              # Progress bar de eventos
│       ├── billing-cancel-dialog.tsx       # Modal de cancelamento
│       └── billing-page-skeleton.tsx       # Loading state da página
│
├── hooks/billing/
│   └── use-billing-subscription.ts         # Fetch GET /billing/subscription + /usage
│
└── types/billing/
    └── billing.ts                          # (já definido em PRD_BILLING_SYSTEM.md)
```

---

## 4. Componentes

### 4.1 `LandingPricing.tsx` (ajuste)

Componente já existe. Ajuste necessário: conectar o botão CTA de cada plano ao handler `GET /api/v1/billing/checkout` do Polar.

**Comportamento:**
- Usuário clica "Começar agora" (Starter ou Pro)
- Verifica se está logado — se não, redireciona para `/login?next=/...`
- Se logado, monta URL: `/api/v1/billing/checkout?products=prod_xxx&customerExternalId=org_id`
- Redireciona com `window.location.href` para o handler
- Handler do Polar redireciona para `polar.sh/checkout`
- Usuário faz pagamento
- Polar redireciona de volta para `/billing/success`
- "Agency" → abre modal/mailto de contato (sem checkout)

**Estado do botão:**
```
idle     → "Começar agora"
loading  → spinner + "Aguarde..." (enquanto redireciona)
error    → "Tentar novamente" + toast de erro
```

**Implementação no componente:**

```typescript
// src/components/landing/LandingPricing.tsx
'use client'
import { useState } from 'react'
import { useSession } from '@/lib/auth/auth-client'
import { env } from '@/lib/env/env'

export function PricingCard({ plan }: { plan: 'starter' | 'pro' | 'agency' }) {
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession()

  async function handleCheckout() {
    // Verificar autenticação
    if (!session?.user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.href)}`
      return
    }

    if (!session?.user.organization?.id) {
      throw new Error('No active organization')
    }

    setLoading(true)

    // Determinar product ID baseado no plano
    const productId = plan === 'starter'
      ? env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID
      : plan === 'pro'
      ? env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID
      : null

    if (!productId) {
      // Agency — abrir modal de contato
      return
    }

    // Montar URL para o handler Checkout
    const params = new URLSearchParams({
      products: productId,
      customerExternalId: session.user.organization.id, // Seu organizationId
      customerEmail: session.user.email,
      customerName: session.user.name || '',
    })

    // Redirecionar para o handler do Polar via Next.js
    window.location.href = `/api/v1/billing/checkout?${params.toString()}`
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      variant="default"
    >
      {loading ? (
        <>
          <Spinner className="mr-2" />
          Aguarde...
        </>
      ) : (
        'Começar agora'
      )}
    </Button>
  )
}
```

**Considerações:**
- O usuário pode não estar logado → verificar `session` no componente e redirecionar para login se necessário
- Usar `organizationId` (seu ID interno) como `customerExternalId` para rastrear
- Não precisa de `CSRF protection` adicional — o handler é `GET` (o Polar cuida da segurança do lado dele)
- O Polar envia webhook com `customerExternalId` — use isso para criar/atualizar `BillingSubscription`

---

### 4.2 `billing-status.tsx` (Client Component)

Card principal da página `/dashboard/billing`. Exibe estado da subscription ativa.

**Estados a renderizar:**

| Estado | UI |
|--------|----|
| `active` + dentro do limite | Badge verde "Ativo", uso em verde |
| `active` + acima do limite (overage) | Badge amarelo "Overage", uso em âmbar |
| `active` + `canceledAtPeriodEnd=true` | Badge amarelo "Será cancelado", data de expiração |
| `canceled` | Badge vermelho "Cancelado", botão de reativar |
| `past_due` | Badge vermelho "Pagamento pendente", link para portal |
| `null` (sem subscription) | CTA para assinar |

**Dados exibidos:**
- Nome do plano (Starter / Pro / Agency)
- Status com badge colorido
- Próxima data de reset ou data de cancelamento
- Botão "Cancelar assinatura" (abre `billing-cancel-dialog`)

---

### 4.3 `usage-progress.tsx` (Client Component)

Progress bar de consumo de eventos do ciclo atual.

**Layout:**
```
Eventos este ciclo
[████████████░░░░░░░░] 142 / 200

Próximo reset: 27/03/2026
```

**Thresholds de cor (Tailwind):**
- `0–79%` → `bg-emerald-500`
- `80–99%` → `bg-amber-500`
- `≥100%` → `bg-red-500` + label "Limite atingido — overage ativo"

---

### 4.4 `billing-cancel-dialog.tsx` (Client Component)

Dialog de confirmação de cancelamento. Usa `AlertDialog` do shadcn/ui.

**Fluxo:**
1. Usuário clica "Cancelar assinatura" em `billing-status`
2. Dialog abre com duas opções:
   - **"Cancelar no fim do período"** (default, recomendado) — acesso continua até a data de renovação
   - **"Cancelar imediatamente"** — acesso encerrado agora
3. Confirma → `POST /api/v1/billing/cancel` com `{ atPeriodEnd: boolean }`
4. Sucesso → fecha dialog + toast "Assinatura cancelada" + atualiza status

**Segurança — CSRF:**
O endpoint `POST /api/v1/billing/cancel` deve validar o header `Origin` ou ser implementado como Server Action para ter CSRF protection built-in.

**Copy:**
```
Cancelar assinatura

Ao cancelar, você perderá acesso ao plano [Starter/Pro] em [data].
Eventos já registrados neste ciclo não serão reembolsados.

[Cancelar no fim do período]   [Cancelar agora]
                               [Manter assinatura]  ← botão de escape
```

---

### 4.5 `billing-page-skeleton.tsx`

Loading state para Suspense boundary da página de billing.

```tsx
// Skeleton do card de status + progress bar
<div className="space-y-4">
  <Skeleton className="h-32 w-full rounded-xl" />
  <Skeleton className="h-20 w-full rounded-xl" />
</div>
```

---

### 4.6 `/dashboard/billing/page.tsx` (Server Component)

```tsx
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageContent } from '@/components/dashboard/layout/page-content'
import { CreditCard } from 'lucide-react'
import { Suspense } from 'react'
import { BillingStatus } from '@/components/dashboard/billing/billing-status'
import { UsageProgress } from '@/components/dashboard/billing/usage-progress'
import { BillingPageSkeleton } from '@/components/dashboard/billing/billing-page-skeleton'

export default function BillingPage() {
  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Billing"
        description="Gerencie sua assinatura e acompanhe o uso de eventos."
        icon={CreditCard}
      />
      <PageContent>
        <Suspense fallback={<BillingPageSkeleton />}>
          <BillingStatus />
          <UsageProgress />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
```

---

### 4.7 `/billing/success/page.tsx` (Server Component)

Página pública exibida após checkout bem-sucedido. Polar redireciona para `successUrl`.

**URL esperada:** `/billing/success?plan=starter`

**UI:**
- Ícone de checkmark animado (motion)
- "Sua assinatura está ativa!" com nome do plano
- Subtext com próximas etapas
- Botão "Ir para o dashboard" → `/dashboard`

**Não** exibir dados sensíveis de pagamento — Polar já fez o processamento.

---

### 4.8 Hook: `use-billing-subscription.ts`

```typescript
// src/hooks/billing/use-billing-subscription.ts
// Client hook para fetch de subscription + usage
// SWR ou React Query — seguir padrão existente no projeto

export function useBillingSubscription() {
  // GET /api/v1/billing/subscription
  // GET /api/v1/billing/usage
  // Retorna: { subscription, usage, isLoading, error }
}
```

**Verificar padrão de data fetching existente** no projeto antes de implementar (SWR vs React Query vs server actions).

---

## 5. Integração com Sidebar

Adicionar item "Billing" na sidebar do dashboard.

**Localização:** `src/components/dashboard/sidebar/` — verificar arquivo de navegação existente.

**Item:**
```
Ícone: CreditCard (lucide-react)
Label: "Billing"
Href: /dashboard/billing
```

Posicionamento sugerido: seção de configurações/conta, abaixo de "Configurações".

---

## 6. Tokens de Design a Usar

| Elemento | Token / Classe |
|----------|---------------|
| Card container | `rounded-xl border bg-card shadow-sm` |
| Badge ativo | `bg-emerald-500/10 text-emerald-600 border-emerald-500/20` |
| Badge overage | `bg-amber-500/10 text-amber-600 border-amber-500/20` |
| Badge cancelado | `bg-red-500/10 text-red-600 border-red-500/20` |
| Progress bar ok | `bg-emerald-500` |
| Progress bar warning | `bg-amber-500` |
| Progress bar over | `bg-red-500` |
| Typography plano | `.text-display` ou `text-xl font-semibold` |
| Typography label | `.text-label` ou `text-xs font-medium text-muted-foreground` |
| Button primário | `variant="default"` (emerald padrão do projeto) |
| Button destrutivo | `variant="destructive"` |

**Animações:** seguir padrão do projeto com `motion/react` e easing `[0.22, 1, 0.36, 1]`.

---

## 7. Tratamento de Estados de Erro

| Cenário | Comportamento |
|---------|--------------|
| `GET /subscription` falha | `error-state.tsx` com botão retry |
| `POST /checkout` falha | Toast de erro + botão volta ao idle |
| `POST /cancel` falha | Toast de erro + dialog permanece aberto |
| Sem subscription | Card com CTA para assinar (link para landing pricing) |
| Usuário sem org ativa | Redirecionar para seleção de organização |

---

## 8. Fases de Implementação

### Phase 5A: Landing (0,5 dia)
- [ ] Ajustar `LandingPricing.tsx` — conectar CTAs ao checkout
- [ ] Implementar estado de loading/erro no botão
- [ ] Verificar comportamento para usuário não autenticado

### Phase 5B: Página de Sucesso (0,5 dia)
- [ ] `/billing/success/page.tsx` com UI de confirmação
- [ ] Animação de checkmark
- [ ] Botão de retorno ao dashboard

### Phase 5C: Dashboard Billing (1 dia)
- [ ] Hook `use-billing-subscription.ts`
- [ ] `billing-status.tsx` com todos os estados
- [ ] `usage-progress.tsx` com thresholds de cor
- [ ] `billing-cancel-dialog.tsx`
- [ ] `billing-page-skeleton.tsx`
- [ ] `/dashboard/billing/page.tsx`
- [ ] Adicionar item "Billing" na sidebar

### Phase 5D: Testes e Validação (0,5 dia)
- [ ] Verificar todos os estados (active, overage, canceled, past_due, null)
- [ ] Testar flow completo: landing → checkout → success → dashboard
- [ ] Verificar responsividade (mobile, tablet, desktop)
- [ ] `npm run lint` + `npm run build`

---

## 9. Success Criteria

- [ ] Botão de checkout na landing redireciona para Polar
- [ ] Página de sucesso exibe confirmação após pagamento
- [ ] Dashboard mostra plano ativo, contador e data de reset
- [ ] Progress bar reflete uso real com cores corretas
- [ ] Modal de cancelamento funciona (ambas as opções)
- [ ] Todos os estados de subscription renderizam corretamente
- [ ] Nenhum `useEffect` ou fetch direto em componente
- [ ] `npm run build` passa sem erros
