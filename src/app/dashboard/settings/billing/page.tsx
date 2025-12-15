'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BillingGate } from '@/components/billing/billing-gate'
import { ChangePlanModal } from '@/components/billing/change-plan-modal'
import { CancelSubscriptionModal } from '@/components/billing/cancel-subscription-modal'
import { useOrganizationLimits } from '@/hooks/use-organization-limits'
import { CreditCard, FileText, TrendingUp, Download, Plus, Trash2, Loader2, RotateCcw } from 'lucide-react'

interface Subscription {
  id: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'paused'
  interval: 'monthly' | 'yearly'
  amountCents: number
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  plan: {
    id: string
    name: string
    maxMetaProfiles: number
    maxMetaAdAccounts: number
    maxWhatsappInstances: number
    maxMembers: number
  }
}

interface PaymentMethod {
  id: string
  type: 'credit_card' | 'debit_card'
  cardBrand: string | null
  cardLast4: string | null
  cardExpMonth: number | null
  cardExpYear: number | null
  isDefault: boolean
}

interface Invoice {
  id: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  totalCents: number
  currency: string
  createdAt: string
  paidAt: string | null
  pdfUrl: string | null
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  trialing: { label: 'Trial', variant: 'outline' },
  past_due: { label: 'Pagamento pendente', variant: 'secondary' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
  incomplete: { label: 'Incompleto', variant: 'secondary' },
  paused: { label: 'Pausado', variant: 'secondary' },
}

const invoiceStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  processing: { label: 'Processando', variant: 'secondary' },
  succeeded: { label: 'Pago', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'secondary' },
}

const cardBrandIcons: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  elo: '💳',
  hipercard: '💳',
}

function formatCurrency(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const isWarning = percentage >= 80
  const isFull = percentage >= 100

  return (
    <div className={`h-2 w-full rounded-full bg-muted ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${
          isFull ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function UsageItem({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limit}
        </span>
      </div>
      <ProgressBar value={used} max={limit} />
    </div>
  )
}

function CurrentPlanCard({ subscription, isLoading }: { subscription?: Subscription | null; isLoading: boolean }) {
  const queryClient = useQueryClient()
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [showCancelSubscription, setShowCancelSubscription] = useState(false)

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/billing/subscription/reactivate', {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao reativar assinatura')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['organization-limits'] })
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plano Atual
          </CardTitle>
          <CardDescription>Nenhuma assinatura ativa</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/pricing">Escolher um plano</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const status = statusConfig[subscription.status] ?? statusConfig.incomplete
  const price = subscription.amountCents / 100
  const intervalLabel = subscription.interval === 'monthly' ? '/mês' : '/ano'
  const canReactivate = subscription.status === 'canceled' && subscription.cancelAtPeriodEnd
  const canCancel = subscription.status === 'active' || subscription.status === 'trialing'

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano Atual
            </CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <CardDescription>
            {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd ? (
              <span className="text-destructive">
                Cancelado - Acesso até {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </span>
            ) : subscription.currentPeriodEnd ? (
              <>Próxima cobrança em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}</>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{subscription.plan.name}</h3>
            <p className="text-lg text-muted-foreground">
              R$ {price.toFixed(2).replace('.', ',')}
              <span className="text-sm">{intervalLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReactivate ? (
              <Button
                variant="default"
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reativando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reativar Assinatura
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowChangePlan(true)}>
                  Mudar plano
                </Button>
                {canCancel && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowCancelSubscription(true)}
                  >
                    Cancelar assinatura
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ChangePlanModal
        open={showChangePlan}
        onOpenChange={setShowChangePlan}
        currentPlanId={subscription.plan.id}
        currentInterval={subscription.interval}
      />

      <CancelSubscriptionModal
        open={showCancelSubscription}
        onOpenChange={setShowCancelSubscription}
        planName={subscription.plan.name}
        currentPeriodEnd={subscription.currentPeriodEnd}
      />
    </>
  )
}

function UsageCard() {
  const { usage, isLoading } = useOrganizationLimits()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Uso do Plano
        </CardTitle>
        <CardDescription>Acompanhe o consumo dos recursos do seu plano</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageItem label="Perfis Meta Ads" used={usage.metaProfiles.used} limit={usage.metaProfiles.limit} />
        <UsageItem label="Contas de Anúncio" used={usage.metaAdAccounts.used} limit={usage.metaAdAccounts.limit} />
        <UsageItem label="Instâncias WhatsApp" used={usage.whatsappInstances.used} limit={usage.whatsappInstances.limit} />
        <UsageItem label="Membros da Equipe" used={usage.members.used} limit={usage.members.limit} />
      </CardContent>
    </Card>
  )
}

function PaymentMethodsCard({ isLoading }: { isLoading: boolean }) {
  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery<PaymentMethod[]>({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing/payment-methods')
      if (!response.ok) {
        if (response.status === 404) return []
        throw new Error('Erro ao carregar métodos de pagamento')
      }
      const data = await response.json()
      return data.items ?? []
    },
  })

  const loading = isLoading || isLoadingMethods

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pagamento
            </CardTitle>
            <CardDescription>Gerencie seus cartões e formas de pagamento</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!paymentMethods || paymentMethods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum método de pagamento cadastrado</p>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {cardBrandIcons[method.cardBrand?.toLowerCase() ?? ''] ?? '💳'}
                  </span>
                  <div>
                    <p className="font-medium">
                      {method.cardBrand ?? 'Cartão'} •••• {method.cardLast4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expira em {method.cardExpMonth?.toString().padStart(2, '0')}/{method.cardExpYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault && (
                    <Badge variant="secondary">Padrão</Badge>
                  )}
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InvoicesCard({ isLoading }: { isLoading: boolean }) {
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing/invoices')
      if (!response.ok) {
        if (response.status === 404) return []
        throw new Error('Erro ao carregar faturas')
      }
      const data = await response.json()
      return data.items ?? []
    },
  })

  const loading = isLoading || isLoadingInvoices

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Faturas
        </CardTitle>
        <CardDescription>Visualize e baixe suas faturas anteriores</CardDescription>
      </CardHeader>
      <CardContent>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura disponível</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const status = invoiceStatusConfig[invoice.status] ?? invoiceStatusConfig.pending
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(invoice.totalCents, invoice.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.pdfUrl ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function BillingContent() {
  const { data: subscription, isLoading } = useQuery<Subscription | null>({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing/subscription')
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Erro ao carregar assinatura')
      }
      return response.json()
    },
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <CurrentPlanCard subscription={subscription} isLoading={isLoading} />
        <UsageCard />
      </div>

      <PaymentMethodsCard isLoading={isLoading} />
      <InvoicesCard isLoading={isLoading} />
    </div>
  )
}

export default function BillingPage() {
  return (
    <BillingGate>
      <BillingContent />
    </BillingGate>
  )
}
