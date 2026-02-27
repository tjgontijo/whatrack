# Dashboard Components - Guia de Uso

## 📦 Componentes Criados

### Layout
- `PageShell` - Container wrapper
- `PageHeader` - Header padronizado
- `PageToolbar` - Toolbar de filtros
- `PageContent` - Content area

### States
- `LoadingSpinner` - Spinner consistente
- `LoadingCard` - Card skeleton
- `LoadingPage` - Page loading
- `TableSkeleton` - Table skeleton
- `EmptyState` - Empty state
- `ErrorState` - Error state

### Filters
- `FilterSelect` - Select com label
- `FilterBar` - Container de filtros
- `SearchInput` - Input de busca

### Metrics
- `MetricCard` - Card de métrica com título, valor, trend
- `StatusBadge` - Badge colorido para status
- `MetricGrid` - Grid responsivo para métricas

---

## 🎨 Exemplos de Uso

### 1. Dashboard/Analytics (Full Width)

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageShell,
  PageHeader,
  PageContent,
} from '@/components/dashboard/layout'
import {
  FilterBar,
  FilterSelect,
  type FilterOption,
} from '@/components/dashboard/filters'
import {
  LoadingPage,
  EmptyState,
  ErrorState,
} from '@/components/dashboard/states'

const periodOptions: FilterOption[] = [
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Este mês', value: 'thisMonth' },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const res = await fetch(`/api/v1/dashboard/summary?period=${period}`)
      if (!res.ok) throw new Error('Falha ao carregar dados')
      return res.json()
    },
  })

  return (
    <PageShell>
      <PageHeader
        title="Visão Geral"
        description="Acompanhe suas métricas em tempo real"
        icon={BarChart3}
        actions={
          <Button onClick={() => refetch()}>
            Atualizar
          </Button>
        }
      />

      <FilterBar>
        <FilterSelect
          label="Período"
          value={period}
          options={periodOptions}
          onValueChange={setPeriod}
        />
        {/* Mais filtros... */}
      </FilterBar>

      <PageContent>
        {isLoading && <LoadingPage message="Carregando dashboard..." />}

        {isError && (
          <ErrorState
            title="Erro ao carregar dados"
            message={error.message}
            action={
              <Button onClick={() => refetch()}>
                Tentar novamente
              </Button>
            }
          />
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-6">
            {/* Métricas, gráficos, etc */}
          </div>
        )}
      </PageContent>
    </PageShell>
  )
}
```

---

### 2. Lista CRUD (Full Width + Search)

```tsx
'use client'

import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageShell,
  PageHeader,
  PageToolbar,
  PageContent,
} from '@/components/dashboard/layout'
import {
  SearchInput,
} from '@/components/dashboard/filters'
import {
  LoadingPage,
  EmptyState,
  TableSkeleton,
} from '@/components/dashboard/states'
import { DataTable } from '@/components/dashboard/data-table'

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useLeads(search)

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        description="Gerencie seus leads e oportunidades"
        icon={Users}
        actions={
          <>
            <Button variant="outline">Exportar</Button>
            <Button>
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </>
        }
      />

      <PageToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, telefone..."
        />
        {/* Filtros, ViewSwitcher, etc */}
      </PageToolbar>

      <PageContent>
        {isLoading && <TableSkeleton rows={10} columns={5} />}

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description="Crie seu primeiro lead para começar"
            action={
              <Button>
                <Plus className="h-4 w-4" />
                Novo Lead
              </Button>
            }
          />
        )}

        {!isLoading && data.length > 0 && (
          <DataTable
            data={data}
            columns={columns}
          />
        )}
      </PageContent>
    </PageShell>
  )
}
```

---

### 3. Settings/Forms (Centered)

```tsx
'use client'

import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  PageShell,
  PageHeader,
  PageContent,
} from '@/components/dashboard/layout'
import {
  LoadingCard,
} from '@/components/dashboard/states'

export default function MyAccountPage() {
  const { data, isLoading } = useCurrentUser()

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Minha Conta"
        description="Gerencie seus dados pessoais e segurança"
        icon={User}
      />

      <PageContent>
        {isLoading && (
          <div className="space-y-6">
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {!isLoading && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Form fields... */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Security settings... */}
              </CardContent>
            </Card>
          </div>
        )}
      </PageContent>
    </PageShell>
  )
}
```

---

### 4. Grid View (Cards)

```tsx
'use client'

import { Smartphone, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageShell,
  PageHeader,
  PageToolbar,
  PageContent,
} from '@/components/dashboard/layout'
import {
  SearchInput,
} from '@/components/dashboard/filters'
import {
  LoadingPage,
  EmptyState,
  LoadingCard,
} from '@/components/dashboard/states'

export default function WhatsAppInstancesPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, refetch, isRefetching } = useInstances()

  return (
    <PageShell>
      <PageHeader
        title="Instâncias WhatsApp"
        description="Gerencie seus números conectados"
        icon={Smartphone}
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nova Instância
          </Button>
        }
      />

      <PageToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar instância..."
        />
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </PageToolbar>

      <PageContent>
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={Smartphone}
            title="Nenhuma instância conectada"
            description="Conecte seu primeiro número do WhatsApp"
            action={
              <Button>
                <Plus className="h-4 w-4" />
                Nova Instância
              </Button>
            }
          />
        )}

        {!isLoading && data.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((instance) => (
              <InstanceCard key={instance.id} {...instance} />
            ))}
          </div>
        )}
      </PageContent>
    </PageShell>
  )
}
```

---

## 🎯 Props Reference

### PageShell

```tsx
interface PageShellProps {
  children: ReactNode
  className?: string
  maxWidth?: '3xl' | '5xl' | '7xl'  // undefined = full width
}
```

### PageHeader

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
}
```

### LoadingSpinner

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
```

### EmptyState

```tsx
interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}
```

### ErrorState

```tsx
interface ErrorStateProps {
  icon?: LucideIcon
  title: string
  message?: string
  action?: ReactNode
  className?: string
}
```

### FilterSelect

```tsx
interface FilterSelectProps {
  label: string
  value: string
  options: FilterOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

interface FilterOption {
  label: string
  value: string
}
```

---

## ✅ Checklist de Uso

Ao criar uma nova página, certifique-se de:

- [ ] Usar `PageShell` como wrapper
- [ ] Usar `PageHeader` com title + description
- [ ] Usar `PageToolbar` para search/filters (se aplicável)
- [ ] Usar `PageContent` para o conteúdo
- [ ] Usar `LoadingPage` ou `TableSkeleton` para loading
- [ ] Usar `EmptyState` quando sem dados
- [ ] Usar `ErrorState` para erros
- [ ] Usar `FilterSelect` ao invés de inline selects
- [ ] Usar `SearchInput` ao invés de Input customizado

---

## 🎨 Design Tokens Usados

```typescript
// Typography
text-display    → 24px semibold (títulos de página)
text-heading    → 20px semibold (títulos de seção)
text-title      → 16px semibold (títulos de card)
text-body       → 14px regular (corpo de texto)
text-caption    → 13px regular (textos secundários)
text-label      → 12px medium (labels de form)

// Colors
bg-gray-50      → Background principal
bg-white        → Cards e containers
border-gray-200 → Borders light
text-gray-900   → Texto principal
text-gray-500   → Texto secundário

emerald-600     → Primary color
red-600         → Error color
```

---

**Próximo:** Migrar páginas existentes para usar esses componentes!
