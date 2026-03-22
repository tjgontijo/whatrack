'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon, EyeIcon, Loader2 } from 'lucide-react'
import { TableVirtuoso } from 'react-virtuoso'

import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import {
  AUDIT_LOG_PERIOD_PRESETS,
  type AuditLogPeriodPreset,
  type AuditLogWithRelations,
  useAuditLogFilters,
  useAuditLogsInfinite,
} from '@/hooks/audit/use-audit-logs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PERIOD_PRESET_LABELS: Record<AuditLogPeriodPreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  '3d': '3 dias',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  thisMonth: 'Este mês',
  lastMonth: 'Mês passado',
  custom: 'Período customizado',
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultLastSevenDaysRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined

  const [yearRaw, monthRaw, dayRaw] = value.split('-')
  const year = Number.parseInt(yearRaw ?? '', 10)
  const month = Number.parseInt(monthRaw ?? '', 10)
  const day = Number.parseInt(dayRaw ?? '', 10)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined
  }

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined
  }

  return parsed
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractChangedFields(before: unknown, after: unknown): string[] {
  const beforeObj = isPlainObject(before) ? before : {}
  const afterObj = isPlainObject(after) ? after : {}

  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])
  const changed: string[] = []

  for (const key of keys) {
    const previousValue = beforeObj[key]
    const nextValue = afterObj[key]

    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      changed.push(key)
    }
  }

  return changed
}

function JsonViewer({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground italic">N/A</span>
  }

  return (
    <pre className="bg-muted overflow-x-auto whitespace-pre-wrap rounded-md p-4 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function AuditLogDetails({ log }: { log: AuditLogWithRelations }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ver detalhes">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da ação</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Data/Hora</p>
              <p className="font-semibold">
                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Equipe</p>
              <p className="font-semibold">Equipe ativa</p>
              <p className="text-muted-foreground text-xs">{log.organizationId || '—'}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Ação</p>
              <p className="font-semibold">{log.action}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Recurso</p>
              <p>
                {log.resourceType}
                {log.resourceId ? ` (${log.resourceId})` : ''}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm font-medium">IP</p>
              <p className="font-mono text-sm">{log.ip || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Request ID</p>
              <p className="font-mono text-sm">{log.requestId || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm font-medium">User Agent</p>
            <p className="text-sm">{log.userAgent || 'N/A'}</p>
          </div>

          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm font-medium">Metadata</p>
            <JsonViewer data={log.metadata} />
          </div>

          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm font-medium">Estado anterior (before)</p>
            <JsonViewer data={log.before} />
          </div>

          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm font-medium">Novo estado (after)</p>
            <JsonViewer data={log.after} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UserCell({ log }: { log: AuditLogWithRelations }) {
  if (!log.user) {
    return <span className="text-muted-foreground text-sm italic">Sistema</span>
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={log.user.image || ''} alt={log.user.name || log.user.email} />
        <AvatarFallback>{(log.user.name || log.user.email).charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{log.user.name || log.user.email}</p>
        <p className="text-muted-foreground truncate text-xs">{log.user.email}</p>
      </div>
    </div>
  )
}

function CustomDatePicker({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  disabled?: (date: Date) => boolean
}) {
  const selectedDate = React.useMemo(() => parseDateInput(value), [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
          data-empty={!selectedDate}
        >
          <CalendarIcon className="h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={selectedDate}
          onSelect={(date) => onChange(date ? formatDateInput(date) : '')}
          disabled={disabled}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}

type AuditLogsTableProps = {
  initialResourceTypes?: string[]
}

export function AuditLogsTable({ initialResourceTypes }: AuditLogsTableProps = {}) {
  const defaultRange = React.useMemo(() => getDefaultLastSevenDaysRange(), [])
  const [periodPreset, setPeriodPreset] = React.useState<AuditLogPeriodPreset>('7d')
  const [startDate, setStartDate] = React.useState(defaultRange.startDate)
  const [endDate, setEndDate] = React.useState(defaultRange.endDate)
  const [resourceType, setResourceType] = React.useState('all')

  const isCustomPeriodInvalid = periodPreset === 'custom' && (!startDate || !endDate)

  const { logs, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAuditLogsInfinite({
      periodPreset,
      startDate: periodPreset === 'custom' ? startDate : undefined,
      endDate: periodPreset === 'custom' ? endDate : undefined,
      resourceType: resourceType === 'all' ? undefined : resourceType,
      pageSize: 50,
      enabled: !isCustomPeriodInvalid,
    })

  const filtersQuery = useAuditLogFilters(true, initialResourceTypes)

  const onEndReached = React.useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handlePeriodChange = React.useCallback(
    (value: string) => {
      const nextPreset = value as AuditLogPeriodPreset
      setPeriodPreset(nextPreset)

      if (nextPreset === 'custom' && (!startDate || !endDate)) {
        setStartDate(defaultRange.startDate)
        setEndDate(defaultRange.endDate)
      }
    },
    [startDate, endDate, defaultRange.startDate, defaultRange.endDate]
  )

  return (
    <div className="space-y-4">
      <div className="bg-muted/10 rounded-xl border p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              Período
            </p>
            <Select value={periodPreset} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_LOG_PERIOD_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {PERIOD_PRESET_LABELS[preset]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodPreset === 'custom' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:col-span-1">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Data inicial
                </p>
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecionar data"
                  disabled={(date) => {
                    const end = parseDateInput(endDate)
                    return end ? date > end : false
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Data final
                </p>
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Selecionar data"
                  disabled={(date) => {
                    const start = parseDateInput(startDate)
                    return start ? date < start : false
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              Recurso
            </p>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os recursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os recursos</SelectItem>
                {(filtersQuery.data?.resourceTypes ?? []).map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(filtersQuery.isLoading || filtersQuery.isError) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filtersQuery.isLoading && (
              <span className="text-muted-foreground text-xs">Carregando filtros...</span>
            )}
            {filtersQuery.isError && (
              <span className="text-destructive text-xs">
                Não foi possível carregar opções de filtros.
              </span>
            )}
          </div>
        )}

        {isCustomPeriodInvalid && (
          <p className="text-destructive mt-2 text-xs">
            Informe data inicial e final no período customizado.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-xl border">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando logs...
          </div>
        </div>
      ) : isError ? (
        <div className="text-destructive rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          {(error as Error)?.message || 'Erro ao carregar logs de auditoria.'}
        </div>
      ) : logs.length === 0 ? (
        <CrudEmptyState
          title="Nenhum log encontrado."
          description="Tente buscar por termos diferentes ou verifique os filtros."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <TableVirtuoso
            data={logs}
            style={{ height: 620 }}
            endReached={onEndReached}
            overscan={200}
            components={{
              Table: ({ style, ...props }) => (
                <table
                  {...props}
                  style={style}
                  className="w-full min-w-[1220px] border-collapse text-left"
                />
              ),
              TableHead: React.forwardRef(({ style, ...props }, ref) => (
                <thead ref={ref as React.Ref<HTMLTableSectionElement>} style={style} {...props} />
              )),
              TableBody: React.forwardRef(({ style, ...props }, ref) => (
                <tbody ref={ref as React.Ref<HTMLTableSectionElement>} style={style} {...props} />
              )),
              TableRow: ({ style, ...props }) => (
                <tr
                  {...props}
                  style={style}
                  className="border-border/50 hover:bg-muted/30 border-b align-top transition-colors"
                />
              ),
            }}
            fixedHeaderContent={() => (
              <tr className="bg-muted/30 border-b">
                <th className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  Data/Hora
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  Ação
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  Recurso
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">
                  Campos alterados
                </th>
                <th className="w-14 px-4 py-2.5" />
              </tr>
            )}
            itemContent={(_index, log) => {
              const changedFields = extractChangedFields(log.before, log.after)

              return (
                <>
                  <td className="whitespace-nowrap px-4 py-3">
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <UserCell log={log} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-background font-mono">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{log.resourceType}</p>
                    <p className="text-muted-foreground max-w-[220px] truncate text-xs">
                      {log.resourceId || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {changedFields.length > 0 ? (
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {changedFields.slice(0, 3).map((field) => (
                          <Badge key={field} variant="secondary" className="text-[10px]">
                            {field}
                          </Badge>
                        ))}
                        {changedFields.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{changedFields.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AuditLogDetails log={log} />
                  </td>
                </>
              )
            }}
          />

          {isFetchingNextPage && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 border-t py-3 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando mais logs...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
