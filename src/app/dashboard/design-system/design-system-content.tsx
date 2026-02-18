'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Palette,
  Type,
  Space,
  Square,
  LayoutDashboard,
  PanelsTopLeft,
  Navigation,
  TableProperties,
  FormInput,
  Bell,
  TrendingUp,
  Users,
  ShoppingBag,
  Package,
  Search,
  Filter,
  Plus,
  Info,
  TriangleAlert,
  CircleCheck,
  OctagonX,
  List,
  Grid3X3,
  Mail,
  Phone,
  Calendar,
  Kanban,
  GripVertical,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ButtonGroup } from '@/components/ui/button-group'

import { DashboardMetricCard } from '@/components/dashboard/charts/card'
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableCardTitle,
  DataTableCardMeta,
  DataTableCardContent,
  DataTableCardRow,
  DataTableCardFooter,
} from '@/components/data-table/cards/data-table-card'
import { SegmentedControl } from '@/components/data-table/segmented-control'

// ─── Navigation Sections ────────────────────────────────────────────────────

const sections = [
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'tipografia', label: 'Tipografia', icon: Type },
  { id: 'espacamento', label: 'Espaçamento', icon: Space },
  { id: 'bordas', label: 'Bordas & Sombras', icon: Square },
  { id: 'cards', label: 'Cards', icon: LayoutDashboard },
  { id: 'shells', label: 'Page Shells', icon: PanelsTopLeft },
  { id: 'navegacao', label: 'Tabs & Navegação', icon: Navigation },
  { id: 'tabelas', label: 'Listas & Tabelas', icon: TableProperties },
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'formularios', label: 'Formulários', icon: FormInput },
  { id: 'feedback', label: 'Feedback', icon: Bell },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionWrapper({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ShowcaseBox({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-muted/20 p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

function TokenLabel({ name, variable }: { name: string; variable: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium truncate">{name}</p>
      <p className="text-[11px] text-muted-foreground font-mono truncate">
        {variable}
      </p>
    </div>
  )
}

// ─── Section: Cores ─────────────────────────────────────────────────────────

function ColorsSection() {
  const groups = [
    {
      title: 'Base',
      tokens: [
        { name: 'Background', variable: '--background', color: 'var(--background)' },
        { name: 'Foreground', variable: '--foreground', color: 'var(--foreground)' },
        { name: 'Card', variable: '--card', color: 'var(--card)' },
        { name: 'Popover', variable: '--popover', color: 'var(--popover)' },
      ],
    },
    {
      title: 'Brand',
      tokens: [
        { name: 'Primary', variable: '--primary', color: 'var(--primary)' },
        { name: 'Primary FG', variable: '--primary-foreground', color: 'var(--primary-foreground)' },
        { name: 'Secondary', variable: '--secondary', color: 'var(--secondary)' },
        { name: 'Accent', variable: '--accent', color: 'var(--accent)' },
      ],
    },
    {
      title: 'Semânticas',
      tokens: [
        { name: 'Success', variable: '--success', color: 'var(--success)' },
        { name: 'Warning', variable: '--warning', color: 'var(--warning)' },
        { name: 'Info', variable: '--info', color: 'var(--info)' },
        { name: 'Destructive', variable: '--destructive', color: 'var(--destructive)' },
      ],
    },
    {
      title: 'UI',
      tokens: [
        { name: 'Muted', variable: '--muted', color: 'var(--muted)' },
        { name: 'Muted FG', variable: '--muted-foreground', color: 'var(--muted-foreground)' },
        { name: 'Border', variable: '--border', color: 'var(--border)' },
        { name: 'Input', variable: '--input', color: 'var(--input)' },
        { name: 'Ring', variable: '--ring', color: 'var(--ring)' },
      ],
    },
    {
      title: 'Charts',
      tokens: [
        { name: 'Chart 1', variable: '--chart-1', color: 'var(--chart-1)' },
        { name: 'Chart 2', variable: '--chart-2', color: 'var(--chart-2)' },
        { name: 'Chart 3', variable: '--chart-3', color: 'var(--chart-3)' },
        { name: 'Chart 4', variable: '--chart-4', color: 'var(--chart-4)' },
        { name: 'Chart 5', variable: '--chart-5', color: 'var(--chart-5)' },
      ],
    },
  ]

  return (
    <SectionWrapper
      id="cores"
      title="Cores"
      description="Paleta de cores do sistema definida via CSS custom properties com OkLCh. Use sempre os tokens — nunca cores hard-coded como text-blue-600."
    >
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {group.tokens.map((token) => (
                <div
                  key={token.variable}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3"
                >
                  <div
                    className="size-10 rounded-lg shrink-0 border border-border/30"
                    style={{ backgroundColor: token.color }}
                  />
                  <TokenLabel name={token.name} variable={token.variable} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Tipografia ────────────────────────────────────────────────────

function TypographySection() {
  const scale = [
    {
      name: 'H1',
      classes: 'text-3xl font-bold tracking-tight',
      text: 'Título Principal',
      usage: 'Cabeçalho de página',
    },
    {
      name: 'H2',
      classes: 'text-2xl font-semibold tracking-tight',
      text: 'Título de Seção',
      usage: 'Seções dentro de uma página',
    },
    {
      name: 'H3',
      classes: 'text-lg font-semibold',
      text: 'Título de Card',
      usage: 'Títulos de cards e dialogs',
    },
    {
      name: 'H4',
      classes: 'text-base font-medium',
      text: 'Subtítulo',
      usage: 'Subtítulos e labels importantes',
    },
    {
      name: 'Body',
      classes: 'text-sm',
      text: 'Corpo de texto padrão do sistema. Usado na maioria dos conteúdos e interfaces.',
      usage: 'Texto principal de conteúdo',
    },
    {
      name: 'Caption',
      classes: 'text-xs text-muted-foreground',
      text: 'Texto auxiliar e secundário',
      usage: 'Metadados, timestamps, dicas',
    },
    {
      name: 'Overline',
      classes: 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
      text: 'LABEL AUXILIAR',
      usage: 'Labels de seção, contadores',
    },
    {
      name: 'Code',
      classes: 'font-mono text-sm',
      text: 'const x = 42',
      usage: 'Código, variáveis, valores técnicos',
    },
  ]

  return (
    <SectionWrapper
      id="tipografia"
      title="Tipografia"
      description="Escala tipográfica usando Geist Sans (texto) e Geist Mono (código). Seguir esta hierarquia garante consistência visual em todas as telas."
    >
      <ShowcaseBox>
        <div className="space-y-6">
          {scale.map((item) => (
            <div
              key={item.name}
              className="flex flex-col gap-1 pb-6 border-b border-border/30 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <Badge variant="outline" className="shrink-0 font-mono">
                  {item.name}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {item.classes}
                </span>
              </div>
              <p className={item.classes}>{item.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Uso: {item.usage}
              </p>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}

// ─── Section: Espaçamento ───────────────────────────────────────────────────

function SpacingSection() {
  const spacingScale = [
    { name: '1', px: '4px', tw: 'p-1 / gap-1' },
    { name: '2', px: '8px', tw: 'p-2 / gap-2' },
    { name: '3', px: '12px', tw: 'p-3 / gap-3' },
    { name: '4', px: '16px', tw: 'p-4 / gap-4' },
    { name: '6', px: '24px', tw: 'p-6 / gap-6' },
    { name: '8', px: '32px', tw: 'p-8 / gap-8' },
    { name: '12', px: '48px', tw: 'p-12 / gap-12' },
    { name: '16', px: '64px', tw: 'p-16 / gap-16' },
  ]

  const patterns = [
    { context: 'Page shell', value: 'px-6 py-4', desc: 'Padding da área de conteúdo principal' },
    { context: 'Card (default)', value: 'py-6, px-6', desc: 'Padding interno de cards padrão' },
    { context: 'Card (sm)', value: 'py-4, px-4', desc: 'Padding interno de cards compactos' },
    { context: 'Toolbar', value: 'px-4 py-3', desc: 'Barras de ferramentas e filtros' },
    { context: 'Entre seções', value: 'gap-6', desc: 'Espaço entre blocos de conteúdo' },
    { context: 'Entre itens', value: 'gap-2 / gap-3', desc: 'Espaço entre elementos relacionados' },
    { context: 'Inline items', value: 'gap-1.5', desc: 'Ícone + texto, badge + label' },
  ]

  return (
    <SectionWrapper
      id="espacamento"
      title="Espaçamento"
      description="Escala de espaçamento baseada no Tailwind. Use estes valores para manter ritmo visual consistente."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Escala
          </h3>
          <div className="space-y-3">
            {spacingScale.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                  {s.name}
                </span>
                <div
                  className="h-5 rounded-md bg-primary/20 border border-primary/30"
                  style={{ width: s.px }}
                />
                <span className="text-xs text-muted-foreground">{s.px}</span>
                <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">
                  {s.tw}
                </span>
              </div>
            ))}
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Padrões de uso
          </h3>
          <div className="space-y-3">
            {patterns.map((p) => (
              <div
                key={p.context}
                className="flex flex-col gap-0.5 pb-3 border-b border-border/30 last:border-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{p.context}</span>
                  <code className="text-[11px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded-md shrink-0">
                    {p.value}
                  </code>
                </div>
                <span className="text-xs text-muted-foreground">{p.desc}</span>
              </div>
            ))}
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Bordas & Sombras ──────────────────────────────────────────────

function BordersSection() {
  const radii = [
    { name: 'sm', tw: 'rounded-sm' },
    { name: 'md', tw: 'rounded-md' },
    { name: 'lg', tw: 'rounded-lg' },
    { name: 'xl', tw: 'rounded-xl' },
    { name: '2xl', tw: 'rounded-2xl' },
    { name: '3xl', tw: 'rounded-3xl' },
    { name: '4xl', tw: 'rounded-4xl' },
  ]

  const shadows = [
    { name: 'shadow-sm', tw: 'shadow-sm', usage: 'Elevação sutil — segmented controls, dropdowns' },
    { name: 'shadow-md', tw: 'shadow-md', usage: 'Cards com hover, popovers' },
    { name: 'shadow-lg', tw: 'shadow-lg', usage: 'Dialogs, sheets, drawers' },
    { name: 'shadow-xl', tw: 'shadow-xl', usage: 'FAB, elementos flutuantes' },
  ]

  return (
    <SectionWrapper
      id="bordas"
      title="Bordas, Sombras & Radius"
      description="Valores padronizados de border-radius, estilos de borda e sombras. O radius base é 0.625rem."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Border Radius
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'size-16 border-2 border-primary/40 bg-primary/5',
                    r.tw
                  )}
                />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {r.name}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Estilos de Borda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">border-border</p>
              <p className="text-xs text-muted-foreground mt-1">
                Padrão — cards, separadores, inputs
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-medium">border-border/50</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sutil — cards de listagem, divisores leves
              </p>
            </div>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Sombras
          </h3>
          <div className="space-y-4">
            {shadows.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div
                  className={cn(
                    'size-16 shrink-0 rounded-xl bg-card border border-border/30',
                    s.tw
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium font-mono">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.usage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Cards ─────────────────────────────────────────────────────────

function CardsSection() {
  return (
    <SectionWrapper
      id="cards"
      title="Cards"
      description="Modelos de card para diferentes contextos. Use sempre os componentes compostos, nunca monte cards com divs avulsas."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Básico */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Card Básico
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Mês</CardTitle>
              <CardDescription>
                Visão geral das métricas de janeiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">1.284</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendas</span>
                  <span className="font-medium">342</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversão</span>
                  <span className="font-medium">26,6%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            Card / CardHeader / CardTitle / CardContent / CardFooter
          </p>
        </div>

        {/* DataTable Card */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            DataTable Card
          </h3>
          <DataTableCard>
            <DataTableCardHeader>
              <DataTableCardTitle>Maria Silva</DataTableCardTitle>
              <DataTableCardMeta>12 jan, 14:30</DataTableCardMeta>
            </DataTableCardHeader>
            <DataTableCardContent>
              <DataTableCardRow label="Telefone">
                <span className="text-sm">+55 11 99999-0000</span>
              </DataTableCardRow>
              <DataTableCardRow label="Email">
                <span className="text-sm text-primary">maria@email.com</span>
              </DataTableCardRow>
              <DataTableCardRow label="Status">
                <Badge variant="secondary">Qualificado</Badge>
              </DataTableCardRow>
            </DataTableCardContent>
            <DataTableCardFooter>
              <Button variant="ghost" size="icon-xs">
                <Phone className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs">
                <Mail className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs">
                <ShoppingBag className="size-3.5" />
              </Button>
            </DataTableCardFooter>
          </DataTableCard>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            DataTableCard / Header / Title / Meta / Content / Row / Footer
          </p>
        </div>

        {/* Metric Card */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Metric Card
          </h3>
          <DashboardMetricCard
            title="Vendas do Mês"
            value="R$ 48.250"
            icon={<TrendingUp className="size-5" />}
            trend={
              <span className="text-success">+12,5% vs mês anterior</span>
            }
          />
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            DashboardMetricCard (title, value, icon, trend)
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Buttons & Badges */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Botões
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button size="default">Default</Button>
              <Button size="lg">LG</Button>
              <Button size="icon">
                <Plus />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonGroup>
                <Button variant="outline">Esquerda</Button>
                <Button variant="outline">Centro</Button>
                <Button variant="outline">Direita</Button>
              </ButtonGroup>
            </div>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Badges
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Para status, use Badge com cores semânticas:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/20">
                  Ativo
                </Badge>
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  Pendente
                </Badge>
                <Badge className="bg-info/10 text-info border-info/20">
                  Em progresso
                </Badge>
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                  Cancelado
                </Badge>
              </div>
            </div>
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Page Shells ───────────────────────────────────────────────────

function ShellsSection() {
  const shells = [
    {
      name: 'CrudPageShell',
      description: 'Shell padrão de todas as páginas CRUD. Header + ViewSwitcher + Toolbar + Content com infinite scroll. Sem paginação.',
      structure: [
        { label: 'Page Header (ícone + título + subtítulo + ações)', height: 'h-14' },
        { label: 'ViewSwitcher (list / cards / kanban)', height: 'h-8' },
        { label: 'Toolbar (search + filtros + contagem de itens)', height: 'h-10' },
        { label: 'Content Area (flex-1, scroll + virtuoso)', height: 'flex-1' },
        { label: 'FAB (+ Adicionar) — posição fixed mobile', height: 'h-6 text-[10px] text-muted-foreground/50' },
      ],
    },
    {
      name: 'CrudDataView',
      description: 'Roteador de view. Renderiza tableView, cardView ou kanbanView conforme o estado.',
      structure: [
        { label: 'view === "list"  →  CrudListView (TableVirtuoso)', height: 'h-10' },
        { label: 'view === "cards" →  CrudCardView (VirtuosoGrid)', height: 'h-10' },
        { label: 'view === "kanban"→  CrudKanbanView (dnd-kit)', height: 'h-10' },
        { label: 'data.length === 0 → Empty State (ícone + texto)', height: 'flex-1' },
      ],
    },
    {
      name: 'CrudListView',
      description: 'Tabela virtualizada com TableVirtuoso. Header fixo, rows lazy-rendered, endReached → fetchNextPage.',
      structure: [
        { label: 'fixedHeaderContent — thead fixo com colunas e labels', height: 'h-9' },
        { label: 'itemContent — rows virtualizadas (renderiza só visíveis)', height: 'flex-1' },
        { label: 'rowActions — dropdown de ações por linha (hover)', height: 'h-6 text-[10px] text-muted-foreground/50' },
      ],
    },
    {
      name: 'CrudCardView',
      description: 'Grid virtualizado com VirtuosoGrid. Responsivo (1→4 colunas), cards com icon/title/badge/footer.',
      structure: [
        { label: 'listClassName: grid gap-3 p-4 — layout do grid', height: 'h-8' },
        { label: 'CardConfig: icon / title / subtitle / badge / footer / onClick', height: 'flex-1' },
        { label: 'endReached → fetchNextPage (infinite scroll)', height: 'h-6 text-[10px] text-muted-foreground/50' },
      ],
    },
  ]

  const patterns = [
    { label: 'useCrudInfiniteQuery', desc: 'Hook: useInfiniteQuery + offset paginação. Retorna data[] flat, total, fetchNextPage, hasNextPage, isLoading.' },
    { label: 'filters → useMemo', desc: 'Filtros computados com useMemo. Debounce de 400ms no search. Reset automático ao mudar filtro.' },
    { label: 'enabledViews', desc: "Prop que define quais views estão disponíveis: ['list', 'cards'] ou ['list', 'cards', 'kanban']." },
    { label: 'isFetchingMore', desc: 'Spinner no rodapé do conteúdo enquanto carrega a próxima página.' },
  ]

  return (
    <SectionWrapper
      id="shells"
      title="Page Shells & Layout"
      description="CrudPageShell é o único shell para páginas CRUD. Usa infinite scroll + virtualização — sem paginação offset."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {shells.map((shell) => (
          <ShowcaseBox key={shell.name}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold font-mono">{shell.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shell.description}
              </p>
            </div>
            <div className="border border-dashed border-border rounded-lg overflow-hidden">
              <div className="flex flex-col gap-px bg-border/50 min-h-[180px]">
                {shell.structure.map((block, i) => (
                  <div
                    key={i}
                    className={cn(
                      'bg-card px-3 flex items-center text-xs text-muted-foreground',
                      block.height === 'flex-1' ? 'flex-1 min-h-[60px]' : block.height
                    )}
                  >
                    <span className="font-mono text-[11px] truncate">
                      {block.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ShowcaseBox>
        ))}
      </div>

      <Separator className="my-6" />

      <ShowcaseBox>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Padrões de implementação
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <div key={p.label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[11px] font-mono font-semibold text-primary mb-1">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}

// ─── Section: Tabs & Navegação ──────────────────────────────────────────────

function NavigationSection() {
  const [segmentValue, setSegmentValue] = useState('tabela')

  return (
    <SectionWrapper
      id="navegacao"
      title="Tabs & Navegação"
      description="Componentes de navegação para organizar conteúdo e alternar entre views."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Tabs — Variante Default
          </h3>
          <Tabs defaultValue="visao-geral">
            <TabsList>
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
            </TabsList>
            <TabsContent value="visao-geral">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Conteúdo da aba Visão Geral
                </p>
              </div>
            </TabsContent>
            <TabsContent value="leads">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Conteúdo da aba Leads
                </p>
              </div>
            </TabsContent>
            <TabsContent value="vendas">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Conteúdo da aba Vendas
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Tabs — Variante Line
          </h3>
          <Tabs defaultValue="todos">
            <TabsList variant="line">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="ativos">Ativos</TabsTrigger>
              <TabsTrigger value="inativos">Inativos</TabsTrigger>
            </TabsList>
            <TabsContent value="todos">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Conteúdo com line tabs
                </p>
              </div>
            </TabsContent>
            <TabsContent value="ativos">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Ativos
                </p>
              </div>
            </TabsContent>
            <TabsContent value="inativos">
              <div className="rounded-lg border border-border/50 p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Inativos
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Segmented Control
          </h3>
          <SegmentedControl
            value={segmentValue}
            onChange={setSegmentValue}
            options={[
              { value: 'tabela', label: 'Tabela', icon: <List className="size-4" /> },
              { value: 'cards', label: 'Cards', icon: <Grid3X3 className="size-4" /> },
            ]}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Use para alternar entre modos de visualização (tabela/cards/kanban).
          </p>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Breadcrumb
          </h3>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Configurações</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>WhatsApp</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <p className="text-xs text-muted-foreground mt-3">
            Navegação hierárquica. Gerada automaticamente pelo DashboardHeader.
          </p>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Tabelas ───────────────────────────────────────────────────────

function TablesSection() {
  const data = [
    { nome: 'Maria Silva', email: 'maria@email.com', status: 'Ativo', vendas: 'R$ 12.400' },
    { nome: 'João Santos', email: 'joao@email.com', status: 'Pendente', vendas: 'R$ 8.200' },
    { nome: 'Ana Costa', email: 'ana@email.com', status: 'Ativo', vendas: 'R$ 22.100' },
    { nome: 'Pedro Lima', email: 'pedro@email.com', status: 'Inativo', vendas: 'R$ 3.050' },
  ]

  return (
    <SectionWrapper
      id="tabelas"
      title="Listas & Tabelas"
      description="Padrões para exibição de dados em formato tabular. Use Table para desktop e DataTableCard para mobile."
    >
      <ShowcaseBox>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.nome}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      row.status === 'Ativo' && 'bg-success/10 text-success border-success/20',
                      row.status === 'Pendente' && 'bg-warning/10 text-warning border-warning/20',
                      row.status === 'Inativo' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {row.vendas}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ShowcaseBox>

      <ShowcaseBox className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Empty State
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-3">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhum item encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Tente ajustar os filtros ou adicione um novo registro.
          </p>
          <Button size="sm" className="mt-4">
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}

// ─── Section: Kanban ────────────────────────────────────────────────────────

function KanbanSection() {
  const columns = [
    { id: 'novo', label: 'Novo', color: '#6366f1', count: 4 },
    { id: 'contato', label: 'Em contato', color: '#f59e0b', count: 7 },
    { id: 'qualificado', label: 'Qualificado', color: '#22c55e', count: 3 },
  ]

  const cards = [
    { id: '1', col: 'novo', name: 'Maria Silva', phone: '+55 11 99999-0000', days: 1 },
    { id: '2', col: 'novo', name: 'João Santos', phone: '+55 21 88888-1111', days: 2 },
    { id: '3', col: 'contato', name: 'Ana Costa', phone: '+55 31 77777-2222', days: 4 },
    { id: '4', col: 'contato', name: 'Pedro Lima', phone: '+55 51 66666-3333', days: 5 },
  ]

  const stageAttrs = [
    { prop: 'columns', type: 'KanbanColumn[]', desc: 'Fases ordenadas pelo campo order' },
    { prop: 'items', type: 'T[]', desc: 'Todos os itens — o componente agrupa internamente' },
    { prop: 'getItemId', type: '(item: T) => string', desc: 'Extrair ID único do item' },
    { prop: 'getColumnId', type: '(item: T) => string', desc: 'Extrair o stageId do item' },
    { prop: 'renderCard', type: '(item: T) => ReactNode', desc: 'Renderizador do card (drag overlay incluso)' },
    { prop: 'onMoveItem', type: '(id, toCol) => void', desc: 'Callback após drop → PATCH /api/v1/tickets/:id' },
    { prop: 'onAddItem', type: '(colId) => void', desc: 'Opcional — botão + no header da coluna' },
  ]

  return (
    <SectionWrapper
      id="kanban"
      title="Kanban View"
      description="CrudKanbanView — view de Kanban genérica com drag-and-drop entre colunas (@dnd-kit). Colunas dinâmicas vindas do TicketStage."
    >
      {/* Mockup visual */}
      <ShowcaseBox className="overflow-x-auto">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Anatomia — CrudKanbanView
        </h3>
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => {
            const colCards = cards.filter((c) => c.col === col.id)
            return (
              <div key={col.id} className="w-[220px] flex flex-col">
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{col.count}</Badge>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border/60 p-2 min-h-[80px]">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-lg border border-border bg-card p-2.5 group/card relative"
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
                        <div>
                          <p className="text-xs font-semibold">{card.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{card.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{card.days}d
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />12
                        </span>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-3">
                      <p className="text-[11px] text-muted-foreground/40">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 font-mono">
          CrudKanbanView — colunas 300px fixas, scroll horizontal, cards arrastáveis com PointerSensor (distance: 8)
        </p>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Props */}
      <ShowcaseBox>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Props do CrudKanbanView
        </h3>
        <div className="space-y-2">
          {stageAttrs.map((attr) => (
            <div key={attr.prop} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
              <code className="text-[11px] font-mono font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md shrink-0 w-fit">{attr.prop}</code>
              <code className="text-[11px] font-mono text-muted-foreground shrink-0">{attr.type}</code>
              <span className="text-xs text-muted-foreground">{attr.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Pipeline settings */}
      <ShowcaseBox>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Gestão de Fases — /dashboard/settings/pipeline
        </h3>
        <div className="space-y-2">
          {[
            { endpoint: 'GET /api/v1/ticket-stages', desc: 'Lista fases da org ordenadas por order ASC. Retorna ticketsCount.' },
            { endpoint: 'POST /api/v1/ticket-stages', desc: 'Cria fase. Body: { name, color, order? }.' },
            { endpoint: 'PUT /api/v1/ticket-stages/:id', desc: 'Atualiza name, color, isDefault, isClosed. Se isDefault=true, unset outros.' },
            { endpoint: 'DELETE /api/v1/ticket-stages/:id', desc: 'Remove fase. Tickets são movidos para a fase padrão antes.' },
            { endpoint: 'PUT /api/v1/ticket-stages/reorder', desc: 'Reordena fases. Body: { orderedIds: string[] }.' },
            { endpoint: 'PATCH /api/v1/tickets/:id', desc: 'Move ticket entre fases. Body: { stageId }. Usado pelo Kanban drag-and-drop.' },
          ].map((api) => (
            <div key={api.endpoint} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
              <code className="text-[11px] font-mono font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md shrink-0 w-fit whitespace-nowrap">{api.endpoint}</code>
              <span className="text-xs text-muted-foreground">{api.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}

// ─── Section: Formulários ───────────────────────────────────────────────────

function FormsSection() {
  return (
    <SectionWrapper
      id="formularios"
      title="Formulários"
      description="Composição de campos usando Field + FieldLabel + Input/Select/etc + FieldError. Sempre usar react-hook-form + zod para validação."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Campos padrão
          </h3>
          <FieldGroup>
            <Field>
              <FieldLabel>Nome completo</FieldLabel>
              <Input placeholder="Digite o nome..." />
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" placeholder="email@exemplo.com" />
              <FieldDescription>
                Usado para notificações do sistema.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Observações</FieldLabel>
              <Textarea placeholder="Detalhes adicionais..." />
            </Field>
          </FieldGroup>
        </ShowcaseBox>

        <div className="space-y-6">
          <ShowcaseBox>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Toggles & Checks
            </h3>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel className="flex-1">
                  <div>
                    <p className="text-sm font-medium">Notificações por email</p>
                    <p className="text-xs text-muted-foreground">
                      Receba atualizações sobre novos leads
                    </p>
                  </div>
                </FieldLabel>
                <Switch />
              </Field>

              <Separator />

              <Field orientation="horizontal">
                <FieldLabel className="flex-1">
                  <div>
                    <p className="text-sm font-medium">Modo escuro automático</p>
                    <p className="text-xs text-muted-foreground">
                      Seguir configuração do sistema
                    </p>
                  </div>
                </FieldLabel>
                <Switch defaultChecked />
              </Field>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms" className="text-sm">
                    Aceito os termos de uso
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="newsletter" defaultChecked />
                  <Label htmlFor="newsletter" className="text-sm">
                    Receber newsletter semanal
                  </Label>
                </div>
              </div>
            </FieldGroup>
          </ShowcaseBox>

          <ShowcaseBox>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Estado de erro
            </h3>
            <FieldGroup>
              <Field data-invalid="true">
                <FieldLabel>Nome do produto</FieldLabel>
                <Input
                  aria-invalid="true"
                  defaultValue=""
                  placeholder="Obrigatório"
                />
                <FieldError>Nome é obrigatório</FieldError>
              </Field>

              <Field data-invalid="true">
                <FieldLabel>Preço</FieldLabel>
                <Input
                  aria-invalid="true"
                  defaultValue="-50"
                />
                <FieldError>O preço deve ser maior que zero</FieldError>
              </Field>
            </FieldGroup>
          </ShowcaseBox>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ─── Section: Feedback ──────────────────────────────────────────────────────

function FeedbackSection() {
  return (
    <SectionWrapper
      id="feedback"
      title="Feedback"
      description="Componentes para comunicar estados, erros, sucesso e carregamento ao usuário."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Alerts
          </h3>
          <div className="space-y-3">
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>
                Sua conta será verificada em até 24 horas.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <OctagonX className="size-4" />
              <AlertTitle>Erro ao salvar</AlertTitle>
              <AlertDescription>
                Não foi possível conectar ao servidor. Tente novamente.
              </AlertDescription>
            </Alert>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Toasts (Sonner)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Clique para disparar cada tipo de notificação.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('Registro salvo com sucesso!')}
            >
              <CircleCheck className="size-4 text-success" />
              Success
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.error('Erro ao processar a solicitação.')}
            >
              <OctagonX className="size-4 text-destructive" />
              Error
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.warning('Atenção: limite de envios atingido.')}
            >
              <TriangleAlert className="size-4 text-warning" />
              Warning
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info('Nova mensagem recebida.')}
            >
              <Info className="size-4 text-info" />
              Info
            </Button>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Skeleton Loading
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Avatares
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tamanhos</p>
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar size="sm">
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;sm&quot; (24px)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar>
                        <AvatarFallback>DF</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;default&quot; (32px)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar size="lg">
                        <AvatarFallback>LG</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;lg&quot; (40px)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Avatar Group</p>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback>MS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+5</AvatarGroupCount>
              </AvatarGroup>
            </div>
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DesignSystemContent() {
  const [activeSection, setActiveSection] = useState('cores')
  const mainRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar Navigation — desktop */}
      <nav className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border/50 bg-background py-6 px-3 overflow-y-auto">
        <div className="mb-6 px-3">
          <h1 className="text-lg font-bold tracking-tight">Design System</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Referência visual
          </p>
        </div>
        <div className="space-y-0.5">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {section.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto px-2 py-2 gap-1 scrollbar-hide">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20 lg:pb-8"
      >
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-16">
          <ColorsSection />
          <Separator />
          <TypographySection />
          <Separator />
          <SpacingSection />
          <Separator />
          <BordersSection />
          <Separator />
          <CardsSection />
          <Separator />
          <ShellsSection />
          <Separator />
          <NavigationSection />
          <Separator />
          <TablesSection />
          <Separator />
          <KanbanSection />
          <Separator />
          <FormsSection />
          <Separator />
          <FeedbackSection />
        </div>
      </main>
    </div>
  )
}
