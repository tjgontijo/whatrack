'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { applyWhatsAppMask } from '@/lib/mask/phone-mask';
import {
  CheckCircle2,
  CircleDashed,
  MessageCircle,
  Inbox,
  ShoppingBag,
  MessageSquareText,
  ClipboardCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LeadTicketsDialog } from '@/components/dashboard/tickets/lead-tickets-dialog';
import { LeadSalesDialog } from '@/components/dashboard/sales/lead-sales-dialog';
import { LeadMessagesDialog } from '@/components/dashboard/messages/lead-messages-dialog';
import { LeadAuditDialog } from '@/components/dashboard/sales_analytics/lead-audit-dialog';
import { cn } from '@/lib/utils';

const DATE_FILTER_OPTIONS = [
  { value: '1d', label: '1 dia' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
] as const;

type DateFilterValue = (typeof DATE_FILTER_OPTIONS)[number]['value'];

type DateFilterSelectValue = DateFilterValue | 'all';

type BooleanFilterKey = 'hasTickets' | 'hasSales' | 'hasMessages' | 'hasAudit';

const BOOLEAN_FILTER_OPTIONS: Array<{
  key: BooleanFilterKey;
  label: string;
}> = [
  { key: 'hasTickets', label: 'Tickets' },
  { key: 'hasSales', label: 'Vendas' },
  { key: 'hasMessages', label: 'Mensagens' },
  { key: 'hasAudit', label: 'Auditorias' },
];

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  mail: string | null;
  instagram: string | null;
  remote_jid: string | null;
  created_at: string;
  hasTickets: boolean;
  hasSales: boolean;
  hasAudit: boolean;
  hasMessages: boolean;
};

type ApiResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

export default function ClientLeadsTable() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10) || 20));

  const rawDateRange = searchParams.get('dateRange');
  const dateRange = React.useMemo<DateFilterValue | undefined>(() => {
    if (!rawDateRange) return undefined;
    return DATE_FILTER_OPTIONS.some((option) => option.value === rawDateRange)
      ? (rawDateRange as DateFilterValue)
      : undefined;
  }, [rawDateRange]);

  const dateSelectValue = dateRange ?? 'all';

  const activeBooleanFilters = React.useMemo<Record<BooleanFilterKey, boolean>>(() => {
    return {
      hasTickets: searchParams.get('hasTickets') === 'true',
      hasSales: searchParams.get('hasSales') === 'true',
      hasMessages: searchParams.get('hasMessages') === 'true',
      hasAudit: searchParams.get('hasAudit') === 'true',
    };
  }, [searchParams]);

  const booleanFilterKey = React.useMemo(() => JSON.stringify(activeBooleanFilters), [activeBooleanFilters]);

  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      mutator(params);
      params.set('page', '1');
      router.push(`/dashboard/leads?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleDateSelectChange = React.useCallback(
    (value: DateFilterSelectValue) => {
      updateQueryParams((params) => {
        if (value === 'all') {
          params.delete('dateRange');
        } else {
          params.set('dateRange', value);
        }
      });
    },
    [updateQueryParams]
  );

  const handleBooleanSwitchChange = React.useCallback(
    (key: BooleanFilterKey, checked: boolean) => {
      updateQueryParams((params) => {
        if (!checked) {
          params.delete(key);
        } else {
          params.set(key, 'true');
        }
      });
    },
    [updateQueryParams]
  );

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ['leads', q, page, pageSize, dateRange ?? null, booleanFilterKey] as const,
    queryFn: async (): Promise<ApiResponse> => {
      const u = new URL('/api/v1/leads', window.location.origin);
      if (q) u.searchParams.set('q', q);
      u.searchParams.set('page', String(page));
      u.searchParams.set('pageSize', String(pageSize));
      if (dateRange) {
        u.searchParams.set('dateRange', dateRange);
      }
      for (const [key, value] of Object.entries(activeBooleanFilters)) {
        if (value) {
          u.searchParams.set(key, 'true');
        }
      }
      console.log('[ClientLeadsTable] fetch', u.toString());
      const res = await fetch(u.toString(), { cache: 'no-store' });
      console.log('[ClientLeadsTable] response', { ok: res.ok, status: res.status });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = (await res.json()) as ApiResponse;
      console.log('[ClientLeadsTable] data', { total: json.total, itemsLen: json.items?.length ?? 0 });
      return json;
    },
    placeholderData: (prev) => prev as ApiResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  });

  const [dialog, setDialog] = React.useState<
    | { lead: Lead; mode: 'tickets' }
    | { lead: Lead; mode: 'sales' }
    | { lead: Lead; mode: 'messages' }
    | { lead: Lead; mode: 'audits' }
    | null
  >(null);

  const handleOpenDialog = React.useCallback((lead: Lead, mode: 'tickets' | 'sales' | 'messages' | 'audits') => {
    setDialog({ lead, mode });
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setDialog(null);
  }, []);

  const columns = React.useMemo<ColumnDef<Lead>[]>(
    () => [
      { header: 'Nome', accessorKey: 'name' },
      {
        header: 'Telefone',
        accessorKey: 'phone',
        cell: ({ getValue }) => {
          const value = getValue() as string | null;

          if (!value) {
            return '';
          }

          const masked = applyWhatsAppMask(value);
          const whatsappNumber = value.replace(/\D/g, '');

          return (
            <div className="flex items-center gap-2">
              <span>{masked}</span>
              {whatsappNumber.length >= 10 && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-600"
                  aria-label={`Conversar no WhatsApp com ${masked}`}
                >
                  <Image
                    src="/images/whatsapp.png"
                    alt="WhatsApp"
                    width={16}
                    height={16}
                    className="h-4 w-4 object-contain"
                  />
                </a>
              )}
            </div>
          );
        },
      },
      {
        header: 'Criado em',
        accessorKey: 'created_at',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? new Date(v).toLocaleString('pt-BR') : '';
        },
      },
      {
        header: () => <span className="block text-center">Ticket</span>,
        accessorKey: 'hasTickets',
        size: 80,
        meta: { className: 'w-20 text-center' },
        cell: ({ getValue, row }) => {
          const value = getValue<boolean>();
          const lead = row.original;
          return (
            <div className="flex justify-center">
              <StatusIconButton
                hasData={value}
                label="Ver tickets do lead"
                onClick={() => handleOpenDialog(lead, 'tickets')}
                activeIcon={Inbox}
                inactiveIcon={Inbox}
                activeClassName="text-blue-600"
                inactiveClassName="text-muted-foreground"
              />
            </div>
          );
        },
      },
      {
        header: () => <span className="block text-center">Vendas</span>,
        accessorKey: 'hasSales',
        size: 80,
        meta: { className: 'w-20 text-center' },
        cell: ({ getValue, row }) => {
          const value = getValue<boolean>();
          const lead = row.original;
          return (
            <div className="flex justify-center">
              <StatusIconButton
                hasData={value}
                label="Ver vendas do lead"
                onClick={() => handleOpenDialog(lead, 'sales')}
                activeIcon={ShoppingBag}
                inactiveIcon={ShoppingBag}
                activeClassName="text-amber-600"
                inactiveClassName="text-muted-foreground"
              />
            </div>
          );
        },
      },
      {
        header: () => <span className="block text-center">Mensagens</span>,
        accessorKey: 'hasMessages',
        size: 80,
        meta: { className: 'w-20 text-center' },
        cell: ({ getValue, row }) => {
          const value = getValue<boolean>();
          const lead = row.original;
          return (
            <div className="flex justify-center">
              <StatusIconButton
                hasData={value}
                label="Ver mensagens do lead"
                onClick={() => handleOpenDialog(lead, 'messages')}
                activeIcon={MessageSquareText}
                inactiveIcon={MessageCircle}
                activeClassName="text-emerald-600"
                inactiveClassName="text-muted-foreground"
              />
            </div>
          );
        },
      },
      {
        header: () => <span className="block text-center">Auditoria</span>,
        accessorKey: 'hasAudit',
        size: 80,
        meta: { className: 'w-20 text-center' },
        cell: ({ getValue, row }) => {
          const value = getValue<boolean>();
          const lead = row.original;
          return (
            <div className="flex justify-center">
              <StatusIconButton
                hasData={value}
                label="Ver auditoria do lead"
                onClick={() => handleOpenDialog(lead, 'audits')}
                activeIcon={ClipboardCheck}
                inactiveIcon={ClipboardCheck}
                activeClassName="text-violet-600"
                inactiveClassName="text-muted-foreground"
              />
            </div>
          );
        },
      },
    ],
    [handleOpenDialog]
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSizeFromData = data?.pageSize ?? pageSize;
  console.log('[ClientLeadsTable] state', { isLoading, isError, total, itemsLen: items.length, page, pageSize: pageSizeFromData });

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
      const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater;
      const nextPage = (next.pageIndex ?? 0) + 1;
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set('page', String(nextPage));
      params.set('pageSize', String(next.pageSize ?? pageSize));
      router.push(`/dashboard/leads?${params.toString()}`);
    },
  });
  console.log('[ClientLeadsTable] table rows', table.getRowModel().rows.length);

  const [input, setInput] = React.useState(q);
  React.useEffect(() => setInput(q), [q]);

  React.useEffect(() => {
    const trimmed = input.trim();

    if (trimmed.length === 0) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q');
        });
      }
      return undefined;
    }

    if (trimmed.length < 3) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q');
        });
      }
      return undefined;
    }

    if (trimmed === q) {
      return undefined;
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('q', trimmed);
      });
    }, 400);

    return () => {
      window.clearTimeout(handle);
    };
  }, [input, q, updateQueryParams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">     
        <Select
          value={dateSelectValue}
          onValueChange={(val) => handleDateSelectChange(val as DateFilterSelectValue)}
        >
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

        {BOOLEAN_FILTER_OPTIONS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 shadow-xs"
          >
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            <Switch
              className="cursor-pointer"
              id={`filter-${key}`}
              checked={activeBooleanFilters[key]}
              onCheckedChange={(checked) => handleBooleanSwitchChange(key, checked)}
              aria-label={`Filtrar por ${label}`}
            />
          </div>
        ))}
        <div className="flex min-w-[280px] flex-1 items-center gap-2">
          <div className="relative w-full">
            <Input
              className="pr-10"
              placeholder="Pesquisar..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {input.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setInput('')}
                className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 rounded-full border border-transparent p-1 text-muted-foreground transition hover:border-border hover:bg-muted"
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
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map((header) => {
                  const metaClass = (header.column.columnDef.meta as { className?: string } | undefined)?.className;
                  return (
                    <th
                      key={header.id}
                      className={cn('px-3 py-2 text-left font-medium', metaClass)}
                      style={{ width: header.column.getSize() ? `${header.column.getSize()}px` : undefined }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-3 py-2" colSpan={columns.length}>Carregando...</td></tr>
            ) : isError ? (
              <tr><td className="px-3 py-2 text-red-600" colSpan={columns.length}>Erro ao carregar</td></tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => {
                    const metaClass = (cell.column.columnDef.meta as { className?: string } | undefined)?.className;
                    return (
                      <td
                        key={cell.id}
                        className={cn('px-3 py-2', metaClass)}
                        style={{ width: cell.column.getSize() ? `${cell.column.getSize()}px` : undefined }}
                      >
                        {flexRender(cell.column.columnDef.cell ?? ((ctx) => String(ctx.getValue() ?? '')), cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr><td className="px-3 py-2" colSpan={columns.length}>Nenhum resultado</td></tr>
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

      {dialog && dialog.mode === 'tickets' && (
        <LeadTicketsDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'sales' && (
        <LeadSalesDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'messages' && (
        <LeadMessagesDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'audits' && (
        <LeadAuditDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        />
      )}
    </div>
  );
}

type StatusIconButtonProps = {
  hasData: boolean;
  label: string;
  onClick: () => void;
  activeIcon?: LucideIcon;
  inactiveIcon?: LucideIcon;
  activeClassName?: string;
  inactiveClassName?: string;
};

function StatusIconButton({
  hasData,
  label,
  onClick,
  activeIcon,
  inactiveIcon,
  activeClassName,
  inactiveClassName,
}: StatusIconButtonProps) {
  const ActiveIcon = activeIcon ?? CheckCircle2;
  const InactiveIcon = inactiveIcon ?? CircleDashed;

  return (
    <button
      type="button"
      title={label}
      onClick={hasData ? onClick : undefined}
      disabled={!hasData}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        hasData
          ? 'cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/40'
          : 'cursor-not-allowed opacity-50'
      )}
    >
      {hasData ? (
        <ActiveIcon className={cn('h-4 w-4 text-emerald-600', activeClassName)} />
      ) : (
        <InactiveIcon className={cn('h-4 w-4 text-muted-foreground', inactiveClassName)} />
      )}
    </button>
  );
}