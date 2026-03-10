'use client'

import Link from 'next/link'
import { useState } from 'react'
import { History, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  BillingPlanListQuery,
  BillingPlanListResponse,
} from '@/schemas/billing/billing-plan-schemas'
import { apiFetch } from '@/lib/api-client'
import { BillingPlanFormDialog } from './billing-plan-form-dialog'
import { BillingPlanHistorySheet } from './billing-plan-history-sheet'
import { BillingPlanSyncBadge } from './billing-plan-sync-badge'

interface BillingPlanListProps {
  data: BillingPlanListResponse
  filters: BillingPlanListQuery
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

function buildPageHref(
  filters: BillingPlanListQuery,
  page: number,
) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(filters.pageSize))

  if (filters.query) {
    params.set('query', filters.query)
  }

  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }

  if (filters.syncStatus !== 'all') {
    params.set('syncStatus', filters.syncStatus)
  }

  if (filters.kind !== 'all') {
    params.set('kind', filters.kind)
  }

  return `/dashboard/settings/billing?${params.toString()}`
}

export function BillingPlanList({ data, filters }: BillingPlanListProps) {
  const router = useRouter()
  const hasPreviousPage = data.page > 1
  const hasNextPage = data.page < data.totalPages
  const previousHref = buildPageHref(filters, Math.max(1, data.page - 1))
  const nextHref = buildPageHref(filters, data.page + 1)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [historyPlanId, setHistoryPlanId] = useState<string | null>(null)
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null)
  const [archivingPlanId, setArchivingPlanId] = useState<string | null>(null)

  const editingPlan = data.items.find((plan) => plan.id === editingPlanId) ?? null
  const historyPlan = data.items.find((plan) => plan.id === historyPlanId) ?? null

  const handleMutationSuccess = () => {
    router.refresh()
  }

  async function handleSync(planId: string) {
    try {
      setSyncingPlanId(planId)
      await apiFetch(`/api/v1/system/billing-plans/${planId}/sync-stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      toast.success('Plano sincronizado com a Stripe')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sincronizar com Stripe')
    } finally {
      setSyncingPlanId(null)
    }
  }

  async function handleArchive(planId: string, planName: string) {
    const confirmed = window.confirm(
      `Arquivar o plano "${planName}"? Ele sairá do catálogo para novas contratações.`,
    )

    if (!confirmed) return

    try {
      setArchivingPlanId(planId)
      await apiFetch(`/api/v1/system/billing-plans/${planId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      })
      toast.success('Plano arquivado')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao arquivar plano')
    } finally {
      setArchivingPlanId(null)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Catálogo de planos</CardTitle>
        <CardDescription>
          Primeira fatia administrativa do billing. Aqui já dá para auditar
          catálogo, sync com Stripe e uso atual por plano.
        </CardDescription>
        <CardAction>
          <Button onClick={() => setEditingPlanId('new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo plano
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
          <input
            type="text"
            name="query"
            defaultValue={filters.query ?? ''}
            placeholder="Buscar por nome ou slug"
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          />

          <select
            name="status"
            defaultValue={filters.status}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <select
            name="syncStatus"
            defaultValue={filters.syncStatus}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">Todo sync</option>
            <option value="synced">Sincronizados</option>
            <option value="pending">Pendentes</option>
            <option value="error">Com erro</option>
          </select>

          <select
            name="kind"
            defaultValue={filters.kind}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">Todo tipo</option>
            <option value="base">Plano base</option>
            <option value="addon">Add-ons</option>
          </select>

          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Total de planos
            </p>
            <p className="mt-2 text-2xl font-semibold">{data.total}</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Página atual
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {data.page}
              <span className="text-muted-foreground text-base font-normal">
                {' '}
                / {Math.max(data.totalPages, 1)}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Itens por página
            </p>
            <p className="mt-2 text-2xl font-semibold">{data.pageSize}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Sync Stripe</TableHead>
              <TableHead>Assinaturas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  Nenhum plano encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.isHighlighted && (
                          <Badge variant="outline">Destaque</Badge>
                        )}
                        {plan.contactSalesOnly && (
                          <Badge variant="outline">Vendas</Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        /{plan.slug}
                      </span>
                      {plan.description && (
                        <p className="text-muted-foreground text-sm">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {formatMoney(plan.monthlyPrice, plan.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {plan.kind === 'base'
                          ? `${plan.trialDays} dias grátis`
                          : 'Cobrado por quantidade'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="text-sm leading-6">
                      <div>{plan.kind === 'base' ? 'Plano base' : 'Add-on'}</div>
                      {plan.addonType ? <div>{plan.addonType}</div> : null}
                      <div>{plan.includedProjects} projetos incluídos</div>
                      <div>{plan.includedWhatsAppPerProject} WhatsApp/projeto</div>
                      <div>{plan.includedMetaAdAccountsPerProject} Meta/projeto</div>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex flex-col gap-2">
                      <BillingPlanSyncBadge syncStatus={plan.syncStatus} />
                      <span className="text-muted-foreground text-xs">
                        {plan.stripePriceId
                          ? `Price: ${plan.stripePriceId}`
                          : 'Sem price ID'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <span className="font-medium">{plan.subscriptionCount}</span>
                  </TableCell>

                  <TableCell className="align-top">
                    <Badge variant={plan.isActive ? 'default' : 'outline'}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlanId(plan.id)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPlanId(plan.id)}
                      >
                        <History className="mr-1.5 h-3.5 w-3.5" />
                        Histórico
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(plan.id)}
                        disabled={syncingPlanId === plan.id}
                      >
                        {syncingPlanId === plan.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Sync
                      </Button>

                      {!plan.deletedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(plan.id, plan.name)}
                          disabled={archivingPlanId === plan.id}
                        >
                          {archivingPlanId === plan.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Arquivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Exibindo {data.items.length} de {data.total} planos.
          </p>

          <div className="flex gap-2">
            {hasPreviousPage ? (
              <Button asChild variant="outline">
                <Link href={previousHref}>Anterior</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Anterior
              </Button>
            )}

            {hasNextPage ? (
              <Button asChild variant="outline">
                <Link href={nextHref}>Próxima</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Próxima
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
      <BillingPlanFormDialog
        open={editingPlanId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlanId(null)
          }
        }}
        plan={editingPlanId === 'new' ? null : editingPlan}
        onSuccess={handleMutationSuccess}
      />
      <BillingPlanHistorySheet
        open={historyPlanId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryPlanId(null)
          }
        }}
        planId={historyPlanId}
        planName={historyPlan?.name}
      />
    </>
  )
}
