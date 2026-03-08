# PRD: Dashboard Redesign - Padrão SaaS Moderno

**Versão:** 1.0
**Data:** 26 de Fevereiro de 2025
**Autor:** Claude Code
**Status:** 🟡 Draft para Aprovação

---

## 📋 Executive Summary

Redesign completo da área logada (dashboard) do WhaTrack seguindo padrões de design de SaaS modernos (Stripe, Linear, Vercel), com foco em **consistência visual**, **hierarquia clara** e **experiência premium**.

**Objetivo:** Transformar interface funcional em interface profissional de nível enterprise.

**Prazo:** 2-3 semanas (implementação incremental)

---

## 🎯 Objetivos

### Primários
1. ✅ **Consistência Visual** - Design system unificado em 100% dos componentes
2. ✅ **Hierarquia Clara** - Usuário sabe onde olhar em <3 segundos
3. ✅ **Profissionalismo** - Look & feel de SaaS enterprise ($$$)
4. ✅ **Performance** - Zero regressão de performance

### Secundários
- Reduzir cognitive load (menos decisões por tela)
- Melhorar first-time user experience
- Aumentar percepção de valor do produto

---

## 🔍 Análise: O Que Podemos Reaproveitar?

### ✅ shadcn/ui Components (Manter 100%)

**Componentes Prontos e Bem Feitos:**
```
✅ Button - CVA bem estruturado, variants corretos
✅ Card - Anatomia completa (Header/Content/Footer/Action)
✅ Badge - Variants + estados
✅ Table - Base sólida
✅ Input, Select, Checkbox, Switch - Form elements ok
✅ Dialog, Drawer, Sheet - Modals funcionais
✅ Tabs, Accordion, Collapsible - Navigation ok
✅ Tooltip, Popover, Dropdown - Overlays ok
✅ Sidebar (shadcn) - Estrutura perfeita
✅ Breadcrumb - Funcional
✅ Skeleton - Já existe!
✅ Sonner (toast) - Notificações ok
```

**Total:** 38 componentes base que **NÃO precisam** ser reescritos! 🎉

### ⚠️ Componentes Customizados (Ajustar)

**Dashboard Components:**
```
⚠️ DashboardMetricCard - Bom, mas ajustar estilos
⚠️ CrudPageShell - Funcional, refinar UX
⚠️ ViewSwitcher - Ok, melhorar visual
⚠️ DashboardHeader - Simplificar
⚠️ Charts (Nivo) - Padronizar cores/styles
```

**Total:** 5 componentes que precisam de **ajustes pontuais**

### ❌ Componentes Novos (Criar)

```
❌ PageShell - Container wrapper consistente
❌ EmptyState - Placeholder para estados vazios
❌ StatusBadge - Badge específico para status
❌ LoadingState - Skeleton + spinner unificado
❌ ErrorState - Tratamento de erros consistente
❌ DataTable - Table otimizado (Stripe-style)
❌ MetricCard - Card otimizado para métricas
```

**Total:** 7 componentes novos

---

## 🎨 Sistema de Design

### Tokens de Design

#### Cores (Manter tailwind.config + adicionar tokens)
```typescript
// Neutrals (Stripe-inspired)
--gray-50: #fafafa
--gray-100: #f5f5f5
--gray-200: #e5e5e5 ← Border padrão
--gray-300: #d4d4d4
--gray-400: #a3a3a3 ← Text muted
--gray-500: #737373 ← Text secondary
--gray-900: #171717 ← Text primary
--gray-950: #0a0a0a

// Brand (já existe emerald)
--emerald-500: #10b981
--emerald-600: #059669

// Status (padronizar uso)
--status-success: emerald-500
--status-warning: amber-500
--status-error: red-500
--status-info: blue-500
```

#### Typography Scale
```typescript
// Definir em tailwind.config.ts
fontSize: {
  'display': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
  'heading': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'title': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
  'caption': ['13px', { lineHeight: '18px', fontWeight: '400' }],
  'label': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.01em' }],
}
```

#### Spacing System (4px base)
```typescript
// Já existe no Tailwind, reforçar uso:
0: 0px
1: 4px
2: 8px
3: 12px
4: 16px
5: 20px
6: 24px ← Page padding padrão
8: 32px
10: 40px
12: 48px ← Section spacing
```

#### Shadows (Stripe-style)
```typescript
boxShadow: {
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}
```

#### Border Radius
```typescript
borderRadius: {
  'sm': '6px',   // inputs, small buttons
  'DEFAULT': '8px',  // cards, buttons
  'lg': '12px',  // modals, large cards
  'xl': '16px',  // hero sections
  'full': '9999px', // pills
}
```

---

## 📦 Componentes: Especificação Detalhada

### 1. PageShell (NOVO)

**Propósito:** Container consistente para todas as páginas

**Anatomia:**
```tsx
<PageShell>
  <PageHeader>
    <PageTitle>Leads</PageTitle>
    <PageDescription>Gerencie seus leads</PageDescription>
    <PageActions>
      <Button>Adicionar</Button>
    </PageActions>
  </PageHeader>

  <PageToolbar> {/* opcional */}
    <SearchInput />
    <FilterGroup />
  </PageToolbar>

  <PageContent>
    {children}
  </PageContent>
</PageShell>
```

**Specs:**
- Background: `bg-gray-50`
- Padding: `px-6 lg:px-8` (24/32px)
- PageHeader: altura fixa `h-20`, border-bottom
- PageToolbar: altura `h-12`, bg-white, border-bottom
- PageContent: flex-1 overflow-auto

**Arquivo:** `src/components/dashboard/layout/page-shell.tsx`

---

### 2. MetricCard (ATUALIZAR EXISTENTE)

**Base:** `src/components/dashboard/charts/card.tsx` (DashboardMetricCard)

**Mudanças:**
```diff
- rounded-3xl (muito arredondado)
+ rounded-lg (8px - Stripe style)

- shadow-[0px_18px_35px_-25px...] (complexo demais)
+ shadow-sm (0 1px 2px rgba(0,0,0,0.05))

- p-6 (padding grande)
+ p-5 (20px - mais compacto)

- hover:-translate-y-0.5
+ hover:-translate-y-1 hover:shadow-md (Stripe bump)
```

**Adicionar:**
- Variant `outline` (apenas border)
- Prop `trend` com cores automáticas (positive: green, negative: red)
- Prop `loading` com skeleton interno

**Arquivo:** Atualizar existente

---

### 3. DataTable (NOVO - Stripe Style)

**Base:** shadcn/ui Table (reaproveitar)

**Adicionar:**
```tsx
<DataTable
  columns={columns}
  data={data}
  sortable
  onSort={handleSort}
  onRowClick={handleRowClick}
  emptyState={<EmptyState />}
  loading={isLoading}
  loadingRows={5}
/>
```

**Features:**
- Row height fixo: `h-12` (48px)
- Hover: `bg-gray-50`
- Click: `cursor-pointer` + `onClick`
- Sort icons automáticos
- Skeleton rows quando loading
- Empty state quando sem dados
- Mono font para valores numéricos

**Arquivo:** `src/components/dashboard/data-table/data-table.tsx`

---

### 4. StatusBadge (NOVO)

**Base:** shadcn/ui Badge (reaproveitar variants)

**Adicionar:**
```tsx
<StatusBadge
  status="active" | "pending" | "completed" | "error"
  dot // opcional
  pulse // opcional
/>
```

**Specs:**
- Altura: `h-6` (24px)
- Padding: `px-2.5`
- Radius: `rounded-full`
- Font: `text-xs font-medium`
- Dot: `w-2 h-2 rounded-full` absolute left

**Cores:**
```typescript
active: bg-emerald-50 text-emerald-700 border-emerald-200
pending: bg-amber-50 text-amber-700 border-amber-200
completed: bg-blue-50 text-blue-700 border-blue-200
error: bg-red-50 text-red-700 border-red-200
```

**Arquivo:** `src/components/dashboard/status-badge.tsx`

---

### 5. EmptyState (NOVO)

**Anatomia:**
```tsx
<EmptyState
  icon={Inbox}
  title="Nenhum lead encontrado"
  description="Crie seu primeiro lead para começar"
  action={<Button>Adicionar Lead</Button>}
/>
```

**Specs:**
- Centralizado: `flex items-center justify-center`
- Icon: `w-12 h-12 text-gray-400`
- Title: `text-lg font-semibold text-gray-900`
- Description: `text-sm text-gray-500 max-w-md`
- Spacing: `space-y-4`

**Arquivo:** `src/components/dashboard/empty-state.tsx`

---

### 6. LoadingState (NOVO)

**Variantes:**
- `<LoadingSpinner />` - Só spinner
- `<LoadingCard />` - Card skeleton
- `<LoadingTable rows={5} />` - Table skeleton
- `<LoadingPage />` - Página inteira

**Specs:**
- Animation: `shimmer` (gradient moving)
- Duration: `1.5s ease-in-out infinite`
- Colors: `bg-gray-200` → `bg-gray-300` → `bg-gray-200`

**Arquivo:** `src/components/dashboard/loading-state.tsx`

---

## 🎨 Páginas: Antes e Depois

### Dashboard Home

**ANTES:**
```
- Cards com rounded-3xl
- Shadows pesados
- Espaçamento irregular
- Sem hierarchy clara
```

**DEPOIS:**
```tsx
<PageShell>
  <PageHeader>
    <PageTitle>Visão Geral</PageTitle>
    <PageActions>
      <DateRangePicker />
    </PageActions>
  </PageHeader>

  <PageContent>
    <MetricGrid cols={4} gap={4}>
      <MetricCard title="Receita" value="R$ 142k" trend="+12%" />
      <MetricCard title="Leads" value="1.247" trend="+8%" />
      <MetricCard title="Vendas" value="89" trend="+15%" />
      <MetricCard title="Ticket Médio" value="R$ 1.595" trend="-3%" />
    </MetricGrid>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Receita por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={revenueData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart data={funnelData} />
        </CardContent>
      </Card>
    </div>
  </PageContent>
</PageShell>
```

---

### Leads List

**ANTES:**
```
- CrudPageShell funcional mas pesado
- Header com muita informação
- Toolbar confuso
```

**DEPOIS:**
```tsx
<PageShell>
  <PageHeader>
    <PageTitle>Leads</PageTitle>
    <PageActions>
      <Button variant="outline" icon={Download}>Exportar</Button>
      <Button icon={Plus}>Novo Lead</Button>
    </PageActions>
  </PageHeader>

  <PageToolbar>
    <SearchInput placeholder="Buscar leads..." />
    <FilterGroup>
      <FilterButton>Status</FilterButton>
      <FilterButton>Origem</FilterButton>
      <FilterButton>Período</FilterButton>
    </FilterGroup>
    <ViewSwitcher views={['list', 'cards', 'kanban']} />
  </PageToolbar>

  <PageContent>
    {view === 'list' && (
      <DataTable
        columns={leadsColumns}
        data={leads}
        onRowClick={handleEdit}
        loading={isLoading}
      />
    )}

    {view === 'cards' && (
      <CardGrid>
        {leads.map(lead => <LeadCard key={lead.id} {...lead} />)}
      </CardGrid>
    )}
  </PageContent>
</PageShell>
```

---

## 🚀 Roadmap de Implementação

### Fase 1: Fundação (2-3 dias)
**Objetivo:** Setup do design system

- [ ] **Day 1: Tokens**
  - Criar `tailwind.config.ts` extensions
  - Definir typography scale
  - Definir shadows
  - Documentar spacing

- [ ] **Day 2: Base Components**
  - PageShell + PageHeader + PageContent
  - EmptyState
  - LoadingState (skeleton)

- [ ] **Day 3: Ajustes**
  - Atualizar MetricCard
  - Criar StatusBadge
  - Documentar uso

**Entregável:** Design system documentado + 5 componentes base

---

### Fase 2: Data Components (2-3 dias)
**Objetivo:** Componentes de visualização de dados

- [ ] **Day 1: DataTable**
  - Componente base
  - Sortable headers
  - Empty state integration

- [ ] **Day 2: Enhancements**
  - Loading skeleton
  - Row actions
  - Batch selection (opcional)

- [ ] **Day 3: Charts**
  - Padronizar cores Nivo
  - Card wrappers
  - Loading states

**Entregável:** Table + Charts prontos para uso

---

### Fase 3: Páginas Core (3-4 dias)
**Objetivo:** Redesign das 3 páginas principais

- [ ] **Day 1: Dashboard Home**
  - Aplicar PageShell
  - Novos MetricCards
  - Charts redesign

- [ ] **Day 2: Leads List**
  - Aplicar PageShell
  - DataTable implementation
  - Filters redesign

- [ ] **Day 3: Sales List**
  - Same pattern de Leads
  - Consistency check

- [ ] **Day 4: Tickets**
  - Kanban view polish
  - List view consistency

**Entregável:** 3 páginas principais redesenhadas

---

### Fase 4: Settings & Polish (2-3 dias)
**Objetivo:** Páginas secundárias + refinamentos

- [ ] **Day 1: Settings Pages**
  - Minha Conta
  - Organização
  - WhatsApp Settings

- [ ] **Day 2: Detail Views**
  - Lead drawer
  - Sale drawer
  - Ticket drawer

- [ ] **Day 3: Polish**
  - Animations
  - Transitions
  - Micro-interactions
  - A11y audit

**Entregável:** Dashboard 100% redesenhado

---

## ✅ Critérios de Sucesso

### Quantitativos
- [ ] 100% das páginas usando PageShell
- [ ] 100% dos cards usando MetricCard/Card padronizado
- [ ] 100% dos status usando StatusBadge
- [ ] 100% dos loading states com skeleton
- [ ] 100% dos empty states com EmptyState
- [ ] 0 regressões de performance (Lighthouse score mantido)

### Qualitativos
- [ ] Look & feel consistente entre todas as páginas
- [ ] First-time user entende hierarquia em <3s
- [ ] Feedback positivo em user testing (3+ usuários)
- [ ] Aprovação do stakeholder

---

## 🎯 Quick Wins (Fazer Primeiro)

### Semana 1: Impacto Visual Imediato
1. **MetricCard redesign** (2h) → Dashboard home já fica premium
2. **PageHeader padrão** (3h) → Todas as páginas ganham hierarchy
3. **StatusBadge** (2h) → Tables ficam mais legíveis
4. **EmptyState** (2h) → UX melhora drasticamente

**Total:** 9 horas → Impacto visual de 80%

---

## 📋 Checklist de Entrega

### Componentes
- [ ] PageShell + family (Header, Content, Toolbar)
- [ ] MetricCard atualizado
- [ ] DataTable (Stripe-style)
- [ ] StatusBadge
- [ ] EmptyState
- [ ] LoadingState (skeleton family)
- [ ] ErrorState

### Páginas
- [ ] Dashboard Home
- [ ] Leads (list + detail)
- [ ] Sales (list + detail)
- [ ] Tickets (list + detail)
- [ ] Settings (todas)

### Documentação
- [ ] Storybook (opcional mas recomendado)
- [ ] README com guia de uso
- [ ] Figma com specs (opcional)

### Quality
- [ ] Lighthouse score mantido (>90)
- [ ] Nenhum erro de console
- [ ] Responsivo (mobile + tablet + desktop)
- [ ] Dark mode funcional
- [ ] Accessibility score >90

---

## 🚫 Out of Scope (Não Fazer Agora)

- [ ] ❌ Criar nova página (só redesign)
- [ ] ❌ Mudar fluxos de negócio
- [ ] ❌ Adicionar features novas
- [ ] ❌ Migrar de stack (manter Next.js + Prisma + shadcn)
- [ ] ❌ Reescrever componentes shadcn/ui (só ajustar)

---

## 💰 ROI Esperado

### Benefícios Diretos
- ✅ Aumento de perceived value (aparência premium)
- ✅ Redução de support tickets (UX clara)
- ✅ Faster onboarding (hierarchy clara)
- ✅ Enterprise readiness (look profissional)

### Benefícios Indiretos
- ✅ Código mais maintainable (patterns consistentes)
- ✅ Faster feature development (components reusáveis)
- ✅ Easier to scale team (design system claro)

---

## 📞 Aprovação Necessária

**Decisões Pendentes:**
1. ❓ Aprovação do design direction (Stripe-inspired)
2. ❓ Priorização de páginas (ordem de implementação)
3. ❓ Timeline (2-3 semanas ok?)
4. ❓ Breaking changes permitidos? (mudanças visuais podem afetar UX atual)

**Próximo Passo:** Review deste PRD + aprovação para começar Fase 1

---

## 🎨 Apêndice: Design Tokens

```typescript
// tailwind.config.ts additions
export const designTokens = {
  colors: {
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5', // ← Border default
      300: '#d4d4d4',
      400: '#a3a3a3', // ← Text muted
      500: '#737373', // ← Text secondary
      900: '#171717', // ← Text primary
      950: '#0a0a0a',
    },
  },

  fontSize: {
    display: ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
    heading: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
    title: ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
    body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
    caption: ['13px', { lineHeight: '18px', fontWeight: '400' }],
    label: ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.01em' }],
  },

  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },

  borderRadius: {
    sm: '6px',
    DEFAULT: '8px',
    lg: '12px',
    xl: '16px',
  },
}
```

---

**FIM DO PRD**

**Status:** 🟡 Aguardando Aprovação
**Next Action:** Review + Go/No-Go Decision
