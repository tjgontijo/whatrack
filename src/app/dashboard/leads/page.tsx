'use client'

import React, { useState } from 'react'
import { Users, Calendar, Edit, Trash2, MessageSquare, Phone, Mail, MapPin, ShoppingCart, TrendingUp } from 'lucide-react'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import { type ColumnDef, type CardConfig, type RowActions, type ViewType } from '@/components/dashboard/crud/types'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlidersHorizontal } from 'lucide-react'

import { NewLeadDialog, EditLeadDialog, DeleteLeadDialog } from '@/components/dashboard/leads'
import { applyWhatsAppMask, denormalizeWhatsApp } from '@/lib/mask/phone-mask'

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  remoteJid: string | null
  createdAt: string
  ticketsCount?: number
  salesCount?: number
  ltv?: number
  firstOrigin?: string | null
  firstSource?: string | null
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '15d', label: '15 dias' },
  { value: '30d', label: '30 dias' },
  { value: '60d', label: '60 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const getInitials = (name: string | null) => (name ? name.slice(0, 2).toUpperCase() : '??')

const getSourceLabel = (source: string | null | undefined) => {
  if (!source) return null
  if (source === 'paid') return 'Pago'
  if (source === 'organic') return 'Orgânico'
  return source
}

export default function LeadsPage() {
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['phone', 'createdAt'])
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.length >= 3 ? searchInput.trim() : '')
    }, 400)
    return () => clearTimeout(handle)
  }, [searchInput])

  const filters = React.useMemo(() => ({
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(dateRange && dateRange !== 'all' ? { dateRange } : {}),
  }), [debouncedSearch, dateRange])

  const {
    data: leads,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCrudInfiniteQuery<Lead>({
    queryKey: ['leads'],
    endpoint: '/api/v1/leads',
    pageSize: 30,
    filters,
  })

  const toggleColumn = (col: string) =>
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )

  const columns: ColumnDef<Lead>[] = [
    {
      key: 'name',
      label: 'Lead',
      render: (lead) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 border border-border/50 shrink-0">
            <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-semibold">
              {getInitials(lead.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-[13px] truncate leading-tight">{lead.name || 'Sem nome'}</span>
            {(lead.firstOrigin || lead.firstSource) && (
              <span className="text-[10px] text-muted-foreground truncate">
                <MapPin className="inline h-2.5 w-2.5 mr-0.5 opacity-60" />
                {[lead.firstOrigin, getSourceLabel(lead.firstSource)].filter(Boolean).join(' • ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    ...(visibleColumns.includes('phone') ? [{
      key: 'phone',
      label: 'Contato',
      width: 160,
      render: (lead: Lead) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-mono text-muted-foreground">
            {lead.phone ? applyWhatsAppMask(denormalizeWhatsApp(lead.phone)) : '—'}
          </span>
          {lead.mail && (
            <span className="text-[10px] text-muted-foreground/70 truncate max-w-[140px]">{lead.mail}</span>
          )}
        </div>
      ),
    }] : []),
    ...(visibleColumns.includes('createdAt') ? [{
      key: 'createdAt',
      label: 'Criado em',
      width: 110,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (lead: Lead) => (
        <span className="text-[11px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
      ),
    }] : []),
  ]

  const cardConfig: CardConfig<Lead> = {
    icon: (lead) => (
      <Avatar className="h-9 w-9 border border-border">
        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
          {getInitials(lead.name)}
        </AvatarFallback>
      </Avatar>
    ),
    title: (lead) => lead.name || 'Sem nome',
    subtitle: (lead) => (
      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        {lead.phone && (
          <span className="flex items-center gap-1 font-mono">
            <Phone className="h-3 w-3 opacity-60" />
            {applyWhatsAppMask(denormalizeWhatsApp(lead.phone))}
          </span>
        )}
        {lead.mail && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 opacity-60 shrink-0" />
            <span className="truncate">{lead.mail}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 opacity-60" />
          {formatDate(lead.createdAt)}
        </span>
      </div>
    ),
    footer: (lead) => (
      <div className="flex items-center justify-between w-full">
        <span className="flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{lead.ticketsCount || 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600">{lead.salesCount || 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600">{formatCurrency(lead.ltv || 0)}</span>
        </span>
      </div>
    ),
  }

  const rowActions: RowActions<Lead> = {
    customActions: (lead) => (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setEditingLeadId(lead.id)}
          title="Editar"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => setDeletingLeadId(lead.id)}
          title="Deletar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </>
    ),
  }

  const filtersNode = (
    <>
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="h-7 w-36 text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  const actionsNode = view === 'list' ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-2 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Exibir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={visibleColumns.includes('phone')}
          onCheckedChange={() => toggleColumn('phone')}
        >
          Telefone
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={visibleColumns.includes('createdAt')}
          onCheckedChange={() => toggleColumn('createdAt')}
        >
          Criado em
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <>
      <CrudPageShell
        title="Leads"
        subtitle="Gerencie seus leads e contatos."
        icon={Users}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por nome, telefone, email..."
        totalItems={total}
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        actions={actionsNode}
        isLoading={isLoading}
        onAdd={() => setIsNewLeadOpen(true)}
      >
        <CrudDataView
          data={leads}
          view={view}
          tableView={
            <CrudListView
              data={leads}
              columns={columns}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          cardView={
            <CrudCardView
              data={leads}
              config={cardConfig}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
        />
      </CrudPageShell>

      {editingLeadId && (
        <EditLeadDialog
          leadId={editingLeadId}
          open={Boolean(editingLeadId)}
          onOpenChange={(open) => !open && setEditingLeadId(null)}
        />
      )}

      {deletingLeadId && (
        <DeleteLeadDialog
          leadId={deletingLeadId}
          open={Boolean(deletingLeadId)}
          onOpenChange={(open) => !open && setDeletingLeadId(null)}
        />
      )}

      <NewLeadDialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen} />
    </>
  )
}
