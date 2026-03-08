# 🎨 Dashboard Design System - Padrão SaaS Moderno

## 📊 Análise do Estado Atual

### ✅ O Que Está Bom
- Sidebar bem estruturada com shadcn/ui
- Sistema de breadcrumbs funcional
- Componentização por domínio (leads, sales, whatsapp)
- Cards com hover effects
- Sistema de views (list/cards/kanban)
- Responsive com mobile

### ⚠️ O Que Precisa Melhorar

#### 1. **Consistência Visual**
- Cores e espaçamentos variando entre componentes
- Falta de sistema de elevação (shadows) padronizado
- Border radius inconsistente (rounded-3xl vs rounded-lg)

#### 2. **Hierarquia de Informação**
- Headers com informações demais
- Falta de destaque para ações primárias
- Breadcrumbs competindo com título da página

#### 3. **Densidade de Interface**
- Muito espaçamento em alguns lugares
- Pouco em outros
- Falta de "breathing room" estratégico

#### 4. **Estados e Feedback**
- Loading states básicos
- Falta de skeleton loaders
- Empty states pouco trabalhados

---

## 🎯 Padrões de SaaS Modernos

### 1. **Stripe** - Minimalismo Preciso
```
Características:
- Sidebar fixa com 240px
- Header super limpo (só título + ações)
- Cards com borders sutis (#e6e6e6)
- Typography scale bem definida
- Espaçamento generoso mas proposital
- Shadows mínimos (0 1px 3px rgba(0,0,0,0.12))
```

### 2. **Linear** - Velocidade e Densidade
```
Características:
- Sidebar 256px com grupos colapsáveis
- Command palette (⌘K) em destaque
- Tables ultra-densas mas legíveis
- Atalhos de teclado visíveis
- Animações rápidas (150ms)
- Font: Inter com -0.01em tracking
```

### 3. **ClickUp** - Flexibilidade e Power Tools
```
Características:
- Sidebar customizável
- Views múltiplas (List/Board/Timeline/Gantt)
- Toolbars contextuais
- Ações em massa visíveis
- Cores funcionais (status)
- Densidade ajustável
```

### 4. **Vercel** - Design Técnico Premium
```
Características:
- Mono fonts para dados técnicos
- Cards com gradientes sutis
- Borders com opacity gradients
- Dark mode como padrão
- Status badges com dots
- Spacing system: 4px base
```

---

## 🏗️ Sistema de Design Proposto

### Cores (Stripe-inspired)

```typescript
// Neutrals (main)
--gray-50: #fafafa
--gray-100: #f5f5f5
--gray-200: #e5e5e5
--gray-300: #d4d4d4
--gray-900: #171717
--gray-950: #0a0a0a

// Brand
--emerald-50: #ecfdf5
--emerald-500: #10b981
--emerald-600: #059669
--emerald-900: #064e3b

// Status
--blue-500: #3b82f6 (info)
--amber-500: #f59e0b (warning)
--red-500: #ef4444 (error)
--green-500: #22c55e (success)
```

### Typography Scale

```typescript
// Headings
h1: 24px / font-bold / -0.02em (Página)
h2: 20px / font-semibold / -0.01em (Seção)
h3: 16px / font-semibold / -0.01em (Card title)
h4: 14px / font-semibold / 0 (Subheading)

// Body
base: 14px / font-normal / 0 (Corpo)
sm: 13px / font-normal / 0 (Secondary)
xs: 12px / font-medium / 0.01em (Labels)

// Mono (dados técnicos)
mono-sm: 13px / JetBrains Mono / 0
```

### Spacing System (4px base)

```typescript
0: 0px
1: 4px
2: 8px
3: 12px
4: 16px
5: 20px
6: 24px
8: 32px
10: 40px
12: 48px
16: 64px
```

### Elevação (Shadows)

```typescript
// Stripe-style shadows
sm: 0 1px 2px rgba(0,0,0,0.05)
DEFAULT: 0 1px 3px rgba(0,0,0,0.1)
md: 0 4px 6px rgba(0,0,0,0.07)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
```

### Border Radius

```typescript
sm: 6px (inputs, small buttons)
DEFAULT: 8px (cards, buttons)
lg: 12px (modals, large cards)
xl: 16px (hero sections)
full: 9999px (pills, avatars)
```

---

## 🎨 Componentes Padronizados

### 1. Page Shell (Container da Página)

```tsx
<PageShell>
  {/* Header fixo */}
  <PageHeader>
    <PageTitle>Leads</PageTitle>
    <PageActions>
      <Button>Adicionar Lead</Button>
    </PageActions>
  </PageHeader>

  {/* Filtros (opcional) */}
  <PageToolbar>
    <SearchInput />
    <FilterGroup />
    <ViewSwitcher />
  </PageToolbar>

  {/* Conteúdo */}
  <PageContent>
    {children}
  </PageContent>
</PageShell>
```

**Características:**
- Header com 60px fixo
- Toolbar com 48px (quando presente)
- Content com scroll interno
- Background: gray-50
- Padding consistente: 24px (desktop) / 16px (mobile)

### 2. Card Component

```tsx
<Card>
  <CardHeader>
    <CardTitle>Receita do Mês</CardTitle>
    <CardAction>
      <IconButton icon={MoreHorizontal} />
    </CardAction>
  </CardHeader>
  <CardBody>
    <Metric value="R$ 142.500" />
    <Trend value="+12.5%" positive />
  </CardBody>
  <CardFooter>
    <Text variant="secondary">vs. mês anterior</Text>
  </CardFooter>
</Card>
```

**Specs:**
- Background: white
- Border: 1px solid gray-200
- Radius: 8px
- Padding: 20px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Hover: translate-y(-1px) + shadow-md

### 3. Data Table (Stripe-style)

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead sortable>Nome</TableHead>
      <TableHead>Status</TableHead>
      <TableHead align="right">Valor</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow interactive>
      <TableCell>João Silva</TableCell>
      <TableCell><StatusBadge status="active" /></TableCell>
      <TableCell align="right" mono>R$ 1.200</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Specs:**
- Row height: 48px
- Border: só horizontal (gray-200)
- Hover: background gray-50
- Font: 14px regular
- Header: 13px medium, uppercase, gray-500
- Mono cells: JetBrains Mono para valores

### 4. Status Badge

```tsx
<StatusBadge status="active" dot />
<StatusBadge status="pending" />
<StatusBadge status="error" pulse />
```

**Specs:**
- Height: 24px
- Padding: 0 10px
- Radius: full (pill)
- Font: 12px medium
- Colors: subtle backgrounds (emerald-50, amber-50, etc.)
- Optional: dot indicator (8px, absolute left)

### 5. Empty State

```tsx
<EmptyState
  icon={Inbox}
  title="Nenhum lead encontrado"
  description="Crie seu primeiro lead para começar"
  action={<Button>Adicionar Lead</Button>}
/>
```

**Specs:**
- Centralizado verticalmente
- Icon: 48x48, gray-400
- Title: 18px semibold, gray-900
- Description: 14px, gray-500
- Spacing: 16px entre elementos

### 6. Skeleton Loaders

```tsx
<SkeletonCard />
<SkeletonTable rows={5} />
<SkeletonMetric />
```

**Specs:**
- Background: gray-200
- Animation: shimmer (1.5s linear infinite)
- Radius: match do componente real
- Height: match do componente real

---

## 📐 Layouts Padrão

### Dashboard Home (Metrics Grid)

```
┌─────────────────────────────────────────┐
│ Page Header (60px)                      │
├─────────────────────────────────────────┤
│ Metrics Grid (4 cols)                   │
│ ┌─────┬─────┬─────┬─────┐              │
│ │ Met │ Met │ Met │ Met │              │
│ └─────┴─────┴─────┴─────┘              │
├─────────────────────────────────────────┤
│ Chart Section (2 cols)                  │
│ ┌──────────────┬───────────┐           │
│ │ Revenue      │ Funnel    │           │
│ │ Chart        │ Chart     │           │
│ └──────────────┴───────────┘           │
└─────────────────────────────────────────┘
```

### List View (Leads/Sales/Tickets)

```
┌─────────────────────────────────────────┐
│ Page Header (60px)                      │
├─────────────────────────────────────────┤
│ Toolbar (48px) - Search + Filters       │
├─────────────────────────────────────────┤
│ Table (scroll)                          │
│ ┌─────────────────────────────────────┐ │
│ │ Row 1                               │ │
│ │ Row 2                               │ │
│ │ Row 3                               │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Detail View (Drawer)

```
┌─────────────────────────┐
│ Header (60px)           │
│ ┌─────┐ Nome + Actions  │
│ │ Ava │                 │
│ └─────┘                 │
├─────────────────────────┤
│ Tabs                    │
│ [Geral] [Atividade]     │
├─────────────────────────┤
│ Content (scroll)        │
│                         │
│ Form Fields             │
│ ...                     │
│                         │
├─────────────────────────┤
│ Footer (sticky)         │
│ [Cancel] [Save]         │
└─────────────────────────┘
```

---

## 🎯 Próximos Passos

### Fase 1: Fundação (1-2 dias)
- [ ] Criar tokens de design (cores, spacing, typography)
- [ ] Padronizar Card component
- [ ] Padronizar PageShell + PageHeader
- [ ] Skeleton loaders base

### Fase 2: Componentes Core (2-3 dias)
- [ ] Data Table novo (Stripe-style)
- [ ] Status Badges padronizados
- [ ] Empty States
- [ ] Loading States
- [ ] Error States

### Fase 3: Páginas (3-5 dias)
- [ ] Dashboard home redesign
- [ ] Leads list redesign
- [ ] Sales list redesign
- [ ] Settings pages redesign

### Fase 4: Polish (2-3 dias)
- [ ] Micro-interactions
- [ ] Animações de transição
- [ ] Dark mode refinement
- [ ] Accessibility audit

---

## 🔗 Referências

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Linear App**: https://linear.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Resend Dashboard**: https://resend.com/emails
- **Tailwind UI**: https://tailwindui.com/components/application-ui

---

## 💡 Princípios de Design

1. **Menos é Mais** - Stripe não usa gradientes, shadows excessivos ou cores demais
2. **Hierarquia Clara** - Uma ação primária por contexto
3. **Consistência Obsessiva** - Mesmo spacing, mesmo radius, mesmas cores
4. **Feedback Imediato** - Loading, success, error sempre visíveis
5. **Mobile-First** - Mas desktop não pode ser afterthought
6. **Acessibilidade** - Contraste, keyboard nav, screen readers
7. **Performance** - Animações 60fps, sem re-renders desnecessários

---

**Próximo passo:** Quer que eu implemente algum desses componentes como referência?
