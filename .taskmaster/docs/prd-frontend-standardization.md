# PRD: Frontend Standardization - Dark Theme Only + Score 98+

## Objetivo
Padronizar todo o frontend do Whatrack para:
1. Usar apenas tema escuro (dark mode only)
2. Usar cores do sistema de design (CSS variables) - zero hardcoded colors
3. Todas as páginas com score 98+
4. Definir padrão Server vs Client Components

---

## 1. Análise de Cores

### 1.1 Estado Atual

**globals.css** já define tema escuro, mas **não está ativo**:
- `<html>` em `layout.tsx` não tem `class="dark"`
- Páginas usam cores hardcoded

### 1.2 Cores Hardcoded Encontradas

| Arquivo | Cores Hardcoded |
|---------|-----------------|
| `page.tsx` (homepage) | `bg-white`, `text-[#0d0f1a]` |
| `not-found.tsx` | `bg-[#f8f9fa]`, `text-[#1D3557]`, `text-[#457B9D]`, `bg-[#1D3557]` |
| `Hero.tsx` | `bg-[#030712]`, `bg-[#050b1b]`, `bg-[#0a0f24]`, `bg-white`, `text-white` |
| `Header.tsx` | `bg-[#04070f]`, `text-white` |
| `Footer.tsx` | `bg-[#04070f]`, `text-white` |
| `CTA.tsx` | `bg-white`, `text-white`, `text-[#050912]` |
| `Pricing.tsx` | `bg-white`, `gray-*`, `blue-*` |
| `SolutionSection.tsx` | `bg-white`, `gray-*`, `amber-*`, `emerald-*`, `blue-*` |
| `ProblemSection.tsx` | `bg-white`, `gray-*`, `red-*` |
| `HowItWorks.tsx` | `bg-white`, `blue-*` |
| `dashboard/page.tsx` | `bg-white/95` |
| `billing/checkout-modal.tsx` | `bg-white` |
| `connect-instance-dialog.tsx` | `bg-white`, `amber-*`, `emerald-*`, `red-*` |
| `change-plan-modal.tsx` | `green-*`, `yellow-*` |
| `usage-indicator.tsx` | `yellow-*` |

### 1.3 Cores Semânticas Necessárias

Para dark mode only, precisamos definir cores semânticas em `globals.css`:

```css
:root {
  /* Cores semânticas para estados */
  --success: oklch(0.696 0.17 162.48);           /* verde */
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.828 0.189 84.429);          /* amarelo */
  --warning-foreground: oklch(0.145 0 0);
  --info: oklch(0.488 0.243 264.376);            /* azul */
  --info-foreground: oklch(0.985 0 0);
}
```

---

## 2. Server vs Client Components

### 2.1 Estado Atual

**22 páginas usam `'use client'`**, muitas desnecessariamente.

### 2.2 Análise: Qual é melhor?

| Aspecto | Server Component | Client Component |
|---------|------------------|------------------|
| **Renderização** | Servidor (streaming) | Cliente (hidratação) |
| **Bundle size** | Menor (não vai pro client) | Maior (vai pro client) |
| **SEO** | Melhor (HTML pronto) | Pior (precisa JS) |
| **Interatividade** | Não pode ter hooks | Pode ter hooks |
| **Data fetching** | Direto no componente | Via hooks/fetch |
| **TTFB** | Menor | Maior |
| **INP** | Melhor | Pior |

### 2.3 Regra de Ouro

> **Server Component por padrão. Client Component só quando NECESSÁRIO.**

### 2.4 Quando usar `'use client'`:

| Necessita Client | Exemplo |
|------------------|---------|
| useState, useEffect | Qualquer state local |
| useForm (react-hook-form) | Formulários |
| onClick, onChange | Event handlers |
| useRouter, useSearchParams | Navegação programática |
| useQuery (TanStack) | Data fetching client-side |
| useContext | Consumir contextos |
| Browser APIs | localStorage, window |

### 2.5 Quando NÃO usar `'use client'`:

| Não necessita Client | Solução |
|---------------------|---------|
| Apenas renderizar HTML | Server Component |
| Fetch de dados | async function no Server Component |
| Passar props para filhos | Server Component |
| Wrapping de Client Components | Server Component |

### 2.6 Padrão Recomendado

```
src/app/dashboard/leads/
├── page.tsx           # Server Component (wrapper)
├── loading.tsx        # Server Component (Skeleton)
├── error.tsx          # Client Component (error boundary)
└── components/
    └── leads-table.tsx # Client Component (interativo)
```

**page.tsx (Server):**
```tsx
import { Suspense } from 'react'
import { LeadsTable } from './components/leads-table'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Leads | Whatrack',
}

export default function LeadsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LeadsTable />
      </Suspense>
    </div>
  )
}
```

**leads-table.tsx (Client):**
```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
// ... componente interativo
```

---

## 3. Arquitetura Dark Mode Only

### 3.1 Ativar Dark Mode Global

**`layout.tsx`:**
```tsx
export default async function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
```

### 3.2 Remover tema claro do globals.css

Manter apenas o tema escuro como `:root`:

```css
:root {
  --radius: 0.625rem;
  /* Dark theme values */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  /* ... resto das variáveis dark */
}

/* Remover .dark {} - não é mais necessário */
```

### 3.3 Mapeamento de Cores

| Hardcoded | Substituir por |
|-----------|---------------|
| `bg-white` | `bg-background` ou `bg-card` |
| `text-white` | `text-foreground` |
| `text-black` | `text-foreground` |
| `bg-[#...]` | `bg-background` ou `bg-card` |
| `text-[#...]` | `text-foreground` ou `text-muted-foreground` |
| `border-gray-*` | `border-border` |
| `bg-gray-50` | `bg-muted` |
| `text-gray-600` | `text-muted-foreground` |
| `red-*` (erro) | `text-destructive`, `bg-destructive` |
| `green-*` (sucesso) | `text-success`, `bg-success` |
| `yellow-*` (warning) | `text-warning`, `bg-warning` |
| `blue-*` (info/primary) | `text-primary`, `bg-primary` |

---

## 4. Requisitos para Score 98+

### 4.1 Checklist Obrigatório

| Critério | Peso | Obrigatório |
|----------|------|-------------|
| loading.tsx | 5 | ✅ |
| error.tsx | 5 | ✅ |
| Metadata/SEO | 5 | ✅ |
| Título `text-2xl font-bold tracking-tight` | 3 | ✅ |
| Shadcn UI (sem HTML nativo) | 5 | ✅ |
| Skeleton para loading | 3 | ✅ |
| React Hook Form + Zod (forms) | 5 | ✅ |
| Server Component quando possível | 5 | ✅ |
| Cores do sistema (sem hardcoded) | 5 | ✅ |
| Empty states | 3 | ✅ |
| Error handling (toast/boundary) | 3 | ✅ |
| data-testid em elementos-chave | 2 | ✅ |

### 4.2 Estrutura de Arquivos Padrão

```
src/app/dashboard/[feature]/
├── page.tsx           # Server Component, metadata, wrapper
├── loading.tsx        # Skeleton loading state
├── error.tsx          # Error boundary
└── components/
    ├── feature-content.tsx    # Client se interativo
    └── feature-table.tsx      # Client se interativo
```

---

## 5. Plano de Implementação

### Fase 1: Infraestrutura (2h)

1. **Ativar dark mode global**
   - Adicionar `className="dark"` no `<html>`
   - Simplificar globals.css (apenas tema escuro)
   - Adicionar cores semânticas (success, warning, info)

2. **Criar loading.tsx global**
   ```tsx
   // src/app/loading.tsx
   import { Skeleton } from '@/components/ui/skeleton'
   export default function Loading() {
     return <div className="p-6"><Skeleton className="h-96 w-full" /></div>
   }
   ```

3. **Criar error.tsx global**
   ```tsx
   // src/app/error.tsx
   'use client'
   export default function Error({ error, reset }) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[50vh]">
         <h2 className="text-xl font-semibold mb-4">Algo deu errado</h2>
         <button onClick={reset}>Tentar novamente</button>
       </div>
     )
   }
   ```

### Fase 2: Homepage (4h)

- Refatorar `page.tsx`, `Hero.tsx`, `Header.tsx`, `Footer.tsx`, etc.
- Substituir todas as cores hardcoded
- Adaptar design para dark mode

### Fase 3: Páginas Públicas (3h)

- `not-found.tsx`
- `pricing/page.tsx`
- Auth pages: sign-in, sign-up, forgot-password, reset-password

### Fase 4: Onboarding (8h)

- Reescrever completamente
- Usar Shadcn UI
- React Hook Form + Zod
- Persistir dados via API

### Fase 5: Dashboard Core (6h)

- Converter páginas para Server Components
- Adicionar loading.tsx por route group
- Padronizar títulos e skeletons

### Fase 6: Settings (3h)

- Padronizar títulos (`text-3xl` → `text-2xl`)
- Carregar dados existentes nos forms
- Loading states

---

## 6. Definições de Padrão

### 6.1 Tipografia

```tsx
// Título de página
<h1 className="text-2xl font-bold tracking-tight">Título</h1>

// Subtítulo
<p className="text-muted-foreground">Descrição</p>

// Título de seção (Card)
<h2 className="text-lg font-semibold">Seção</h2>
```

### 6.2 Espaçamento

```tsx
// Container de página
<div className="p-6 space-y-6">

// Header de página
<div className="flex items-center justify-between">
```

### 6.3 Cores (apenas tokens)

```tsx
// Backgrounds
bg-background   // fundo principal
bg-card         // cards e modais
bg-muted        // áreas secundárias
bg-primary      // ações primárias
bg-destructive  // erros e exclusões

// Textos
text-foreground         // texto principal
text-muted-foreground   // texto secundário
text-primary            // links e ações
text-destructive        // erros

// Borders
border-border   // bordas padrão
border-input    // inputs
```

### 6.4 Estados de Feedback

```tsx
// Sucesso
<div className="bg-success/10 text-success border-success/20">

// Warning
<div className="bg-warning/10 text-warning border-warning/20">

// Erro
<div className="bg-destructive/10 text-destructive border-destructive/20">

// Info
<div className="bg-primary/10 text-primary border-primary/20">
```

---

## 7. Estimativas

| Fase | Horas | Prioridade |
|------|-------|------------|
| Infraestrutura | 2h | P0 |
| Homepage | 4h | P1 |
| Páginas Públicas | 3h | P1 |
| Onboarding | 8h | P0 |
| Dashboard Core | 6h | P2 |
| Settings | 3h | P2 |
| **Total** | **26h** | - |

---

## 8. Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Score médio | 74.5 | 98+ |
| Páginas críticas | 2 | 0 |
| loading.tsx | 0 | 19 |
| error.tsx | 0 | 1 global + por route group |
| Cores hardcoded | 50+ | 0 |
| Server Components | ~0 | ~15 |
