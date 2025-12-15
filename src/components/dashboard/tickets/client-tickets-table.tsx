'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/mask/formatters'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import { LeadTicketsDialog } from '@/components/dashboard/tickets/lead-tickets-dialog'
import { ticketsListResponseSchema, type TicketsListResponse, type TicketListItem } from '@/lib/schema/lead-tickets'
import { X } from 'lucide-react'

const DATE_FILTER_OPTIONS = [
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
] as const

type DateFilterValue = (typeof DATE_FILTER_OPTIONS)[number]['value']

type DateFilterSelectValue = DateFilterValue | 'all'

export default function ClientTicketsTable() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20))
  const status = searchParams.get('status') || undefined
  const statusSelectValue = status ?? 'all'

  const rawDateRange = searchParams.get('dateRange')
  const dateRange = React.useMemo<DateFilterValue | undefined>(() => {
    if (!rawDateRange) return undefined
    return DATE_FILTER_OPTIONS.some((option) => option.value === rawDateRange)
      ? (rawDateRange as DateFilterValue)
      : undefined
  }, [rawDateRange])

  const dateSelectValue = dateRange ?? 'all'

  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1')
      router.push(`/dashboard/tickets?${params.toString()}`)
    },
    [router, searchParams],
  )

  const handleDateSelectChange = React.useCallback(
    (value: DateFilterSelectValue) => {
      updateQueryParams((params) => {
        if (value === 'all') {
          params.delete('dateRange')
        } else {
          params.set('dateRange', value)
        }
      })
    },
    [updateQueryParams],
  )

  const handleStatusSelectChange = React.useCallback(
    (value: string) => {
      updateQueryParams((params) => {
        if (value === 'all') {
          params.delete('status')
        } else {
          params.set('status', value)
        }
      })
    },
    [updateQueryParams],
  )

  const { data, isLoading, isError } = useQuery<TicketsListResponse>({
    queryKey: ['tickets', q, page, pageSize, dateRange ?? null, status ?? null] as const,
    queryFn: async () => {
      const url = new URL('/api/v1/tickets', window.location.origin)
      if (q) url.searchParams.set('q', q)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(pageSize))
      if (dateRange) url.searchParams.set('dateRange', dateRange)
      if (status) url.searchParams.set('status', status)

      const response = await fetch(url.toString(), { cache: 'no-store' })
      if (!response.ok) throw new Error('Falha ao carregar tickets')
      const json = await response.json()
      return ticketsListResponseSchema.parse(json)
    },
    placeholderData: (prev) => prev as TicketsListResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  })

  const items = React.useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0
  const pageSizeFromData = data?.pageSize ?? pageSize
  const statusOptions = React.useMemo(() => {
    const list = data?.availableStatuses?.filter((value): value is string => Boolean(value?.length)) ?? []
    return Array.from(new Set(list))
  }, [data?.availableStatuses])

  const [dialogLeadId, setDialogLeadId] = React.useState<string | null>(null)
  const selectedLead = React.useMemo(() => {
    if (!dialogLeadId) return null
    const record = items.find((item) => item.leadId === dialogLeadId)
    return record ?? null
  }, [dialogLeadId, items])

  const columns = React.useMemo<ColumnDef<TicketListItem>[]>(
    () => [
      {
        header: 'Criado em',
        accessorKey: 'createdAt',
        cell: ({ getValue }) => formatDateTime(getValue() as string),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const value = (getValue() as string | null) ?? 'Sem status'
          return <Badge variant="outline">{value}</Badge>
        },
      },
      {
        header: 'Lead',
        accessorKey: 'leadName',
        cell: ({ row }) => {
          const leadName = row.original.leadName ?? '—'
          const mail = row.original.leadMail
          const instagram = row.original.leadInstagram
          return (
            <div className="space-y-1">
              <p className="font-medium text-foreground">{leadName}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {mail ? <span>{mail}</span> : null}
                {instagram ? <span>@{instagram}</span> : null}
              </div>
            </div>
          )
        },
      },
      {
        header: 'Telefone',
        accessorKey: 'leadPhone',
        cell: ({ getValue, row }) => {
          const phone = getValue() as string | null
          if (!phone) return '—'
          const masked = applyWhatsAppMask(phone)
          const whatsappNumber = phone.replace(/\D/g, '')
          return (
            <div className="flex items-center gap-2">
              <span>{masked}</span>
              {whatsappNumber.length >= 10 ? (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <Image src="/images/whatsapp.png" alt="WhatsApp" width={16} height={16} className="h-4 w-4 object-contain" />
                </a>
              ) : null}
              {row.original.leadId ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-1 cursor-pointer px-2 py-1 text-xs"
                  onClick={() => setDialogLeadId(row.original.leadId!)}
                >
                  Ver lead
                </Button>
              ) : null}
            </div>
          )
        },
      },
      {
        header: 'UTM',
        accessorKey: 'utmSource',
        cell: ({ row }) => {
          const { utmSource, utmMedium, utmCampaign } = row.original
          return (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium">Origem:</span> {utmSource ?? '—'}</p>
              <p><span className="font-medium">Meio:</span> {utmMedium ?? '—'}</p>
              <p><span className="font-medium">Campanha:</span> {utmCampaign ?? '—'}</p>
            </div>
          )
        },
      },
      {
        header: 'Pipefy',
        accessorKey: 'pipefyId',
        cell: ({ row }) => {
          const { pipefyId, pipefyUrl } = row.original
          if (!pipefyId) return '—'
          if (!pipefyUrl) return pipefyId
          return (
            <a
              href={pipefyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-4"
            >
              {pipefyId}
            </a>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(total / pageSizeFromData) : -1,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater
      const nextPage = (next.pageIndex ?? 0) + 1
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('page', String(nextPage))
      params.set('pageSize', String(next.pageSize ?? pageSize))
      router.push(`/dashboard/tickets?${params.toString()}`)
    },
  })

  const [searchInput, setSearchInput] = React.useState(q)
  React.useEffect(() => setSearchInput(q), [q])

  React.useEffect(() => {
    const trimmed = searchInput.trim()

    if (!trimmed) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
        })
      }
      return undefined
    }

    if (trimmed.length < 3) {
      return undefined
    }

    if (trimmed === q) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('q', trimmed)
      })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [searchInput, q, updateQueryParams])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={dateSelectValue} onValueChange={(val) => handleDateSelectChange(val as DateFilterSelectValue)}>
          <SelectTrigger className="w-[160px] justify-between">
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Datas</span>
              <SelectValue placeholder="Todas as datas" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as datas</SelectItem>
            {DATE_FILTER_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusSelectValue} onValueChange={handleStatusSelectChange}>
          <SelectTrigger className="w-[180px] justify-between">
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</span>
              <SelectValue placeholder="Todos os status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map((statusValue) => (
              <SelectItem key={statusValue} value={statusValue}>
                {statusValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex min-w-[280px] flex-1 items-center gap-2">
          <div className="relative w-full">
            <Input
              className="pr-10"
              placeholder="Pesquisar..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            {searchInput.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-transparent p-1 text-muted-foreground transition hover:border-border hover:bg-muted"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headGroup) => (
              <tr key={headGroup.id} className="border-b bg-muted/50">
                {headGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-2" colSpan={columns.length}>
                  Carregando...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td className="px-3 py-2 text-red-600" colSpan={columns.length}>
                  Erro ao carregar
                </td>
              </tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell ?? ((ctx) => String(ctx.getValue() ?? '')), cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-2" colSpan={columns.length}>
                  Nenhum resultado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div>
          Página {page} de {data ? Math.max(1, Math.ceil(total / pageSizeFromData)) : 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={page <= 1 || isLoading}
            onClick={() => table.setPageIndex(page - 2)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={isLoading || (data && page >= Math.ceil(total / pageSizeFromData))}
            onClick={() => table.setPageIndex(page)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {selectedLead && dialogLeadId ? (
        <LeadTicketsDialog
          leadId={dialogLeadId}
          leadName={selectedLead.leadName}
          leadPhone={selectedLead.leadPhone}
          open={Boolean(dialogLeadId)}
          onOpenChange={(open) => {
            if (!open) {
              setDialogLeadId(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
