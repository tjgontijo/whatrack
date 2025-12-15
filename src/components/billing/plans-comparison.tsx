'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, Sparkles, Users, Monitor, MessageSquare, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan, PaymentInterval } from './checkout-modal'

interface PlanWithPrices extends Plan {
  slug: string
  maxMetaProfiles: number
  maxMetaAdAccounts: number
  maxWhatsappInstances: number
  maxMembers: number
  isRecommended?: boolean
}

interface PlansComparisonProps {
  currentPlanId?: string | null
  onSelectPlan?: (plan: PlanWithPrices, interval: PaymentInterval) => void
  showCurrentBadge?: boolean
}

// Format currency
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

// Feature item component
function FeatureItem({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {Icon ? (
        <Icon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Check className="h-4 w-4 text-primary" />
      )}
      <span>{children}</span>
    </li>
  )
}

// Plan card skeleton
function PlanCardSkeleton() {
  return (
    <Card className="relative">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}

// Plan card component
function PlanCard({
  plan,
  interval,
  isCurrentPlan,
  onSelect,
  showCurrentBadge,
}: {
  plan: PlanWithPrices
  interval: PaymentInterval
  isCurrentPlan: boolean
  onSelect: () => void
  showCurrentBadge: boolean
}) {
  const price = interval === 'monthly' ? plan.priceMonthlyCents : plan.priceYearlyCents
  const monthlyEquivalent = interval === 'yearly' ? Math.round(price / 12) : price
  const isRecommended = plan.isRecommended || plan.slug === 'pro'

  return (
    <Card
      className={cn(
        'relative flex flex-col transition-all duration-200',
        isRecommended && 'border-primary shadow-lg scale-[1.02]',
        isCurrentPlan && showCurrentBadge && 'ring-2 ring-primary/50'
      )}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-primary">
            <Sparkles className="h-3 w-3" />
            Recomendado
          </Badge>
        </div>
      )}

      {isCurrentPlan && showCurrentBadge && (
        <div className="absolute -top-3 right-4">
          <Badge variant="secondary">Plano Atual</Badge>
        </div>
      )}

      <CardHeader className={cn(isRecommended && 'pt-6')}>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span
              className="text-4xl font-bold tabular-nums transition-all duration-300"
              key={`${plan.id}-${interval}`}
            >
              {formatCurrency(monthlyEquivalent)}
            </span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          {interval === 'yearly' && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(price)} cobrado anualmente
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3">
          <FeatureItem icon={BarChart3}>
            {plan.maxMetaProfiles} {plan.maxMetaProfiles === 1 ? 'Perfil' : 'Perfis'} Meta Ads
          </FeatureItem>
          <FeatureItem icon={Monitor}>
            {plan.maxMetaAdAccounts} {plan.maxMetaAdAccounts === 1 ? 'Conta' : 'Contas'} de Anúncio
          </FeatureItem>
          <FeatureItem icon={MessageSquare}>
            {plan.maxWhatsappInstances} {plan.maxWhatsappInstances === 1 ? 'Instância' : 'Instâncias'} WhatsApp
          </FeatureItem>
          <FeatureItem icon={Users}>
            {plan.maxMembers} {plan.maxMembers === 1 ? 'Membro' : 'Membros'} na equipe
          </FeatureItem>
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isRecommended ? 'default' : 'outline'}
          disabled={isCurrentPlan && showCurrentBadge}
          onClick={onSelect}
        >
          {isCurrentPlan && showCurrentBadge ? 'Plano Atual' : 'Selecionar'}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Interval toggle component
function IntervalToggle({
  interval,
  onChange,
  yearlyDiscount,
}: {
  interval: PaymentInterval
  onChange: (interval: PaymentInterval) => void
  yearlyDiscount: number
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Label
        htmlFor="interval-toggle"
        className={cn(
          'cursor-pointer transition-colors',
          interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        Mensal
      </Label>
      <Switch
        id="interval-toggle"
        checked={interval === 'yearly'}
        onCheckedChange={(checked) => onChange(checked ? 'yearly' : 'monthly')}
      />
      <div className="flex items-center gap-2">
        <Label
          htmlFor="interval-toggle"
          className={cn(
            'cursor-pointer transition-colors',
            interval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Anual
        </Label>
        {yearlyDiscount > 0 && (
          <Badge variant="secondary" className="text-xs">
            -{yearlyDiscount}%
          </Badge>
        )}
      </div>
    </div>
  )
}

// Main PlansComparison component
export function PlansComparison({
  currentPlanId,
  onSelectPlan,
  showCurrentBadge = true,
}: PlansComparisonProps) {
  const [interval, setInterval] = useState<PaymentInterval>('monthly')

  const { data: plansData, isLoading } = useQuery<{ items: PlanWithPrices[] }>({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing/plans')
      if (!response.ok) {
        throw new Error('Erro ao carregar planos')
      }
      return response.json()
    },
  })

  const plans = plansData?.items ?? []

  // Calculate yearly discount based on first plan with both prices
  const yearlyDiscount = plans.length > 0
    ? Math.round(
        (1 - (plans[0].priceYearlyCents / 12) / plans[0].priceMonthlyCents) * 100
      )
    : 20

  const handleSelectPlan = (plan: PlanWithPrices) => {
    onSelectPlan?.(plan, interval)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PlanCardSkeleton />
          <PlanCardSkeleton />
          <PlanCardSkeleton />
        </div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Interval Toggle */}
      <IntervalToggle
        interval={interval}
        onChange={setInterval}
        yearlyDiscount={yearlyDiscount}
      />

      {/* Plans Grid */}
      <div
        className={cn(
          'grid gap-6',
          plans.length === 1 && 'max-w-md mx-auto',
          plans.length === 2 && 'md:grid-cols-2 max-w-3xl mx-auto',
          plans.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={() => handleSelectPlan(plan)}
            showCurrentBadge={showCurrentBadge}
          />
        ))}
      </div>

      {/* Additional info */}
      <p className="text-center text-sm text-muted-foreground">
        Todos os planos incluem suporte por email. Cancele quando quiser.
      </p>
    </div>
  )
}
