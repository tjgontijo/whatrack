'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PublicBillingPlan } from '@/schemas/billing/billing-plan-schemas'

interface CheckoutPageContentProps {
  plans: PublicBillingPlan[]
  campaignSlug?: string
  cpfCnpj: string
  organizationId: string
  orgSlug: string
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function CheckoutPageContent({
  plans,
  campaignSlug,
  cpfCnpj,
  organizationId,
  orgSlug,
}: CheckoutPageContentProps) {
  const router = useRouter()

  const basePlans = useMemo(
    () => plans.filter((p) => p.kind === 'base' && !p.contactSalesOnly),
    [plans],
  )

  const defaultPlan = useMemo(() => {
    if (campaignSlug) {
      const match = basePlans.find((p) => p.slug === campaignSlug)
      if (match) return match
    }
    return basePlans.find((p) => p.isHighlighted) ?? basePlans[0]
  }, [basePlans, campaignSlug])

  const [selectedPlan, setSelectedPlan] = useState<PublicBillingPlan | undefined>(defaultPlan)
  const [holderName, setHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [ccv, setCcv] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedPlan) {
      toast.error('Selecione um plano')
      return
    }

    const rawCard = cardNumber.replace(/\D/g, '')
    const rawExpiry = expiryMonth && expiryYear

    if (!holderName.trim() || !rawCard || !rawExpiry || !ccv.trim()) {
      toast.error('Preencha todos os dados do cartão')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          planCode: selectedPlan.code ?? selectedPlan.slug,
          paymentMethod: 'CREDIT_CARD',
          cpfCnpj,
          installments: 1,
          creditCard: {
            holderName: holderName.trim(),
            number: rawCard,
            expiryMonth,
            expiryYear,
            ccv: ccv.trim(),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.message ?? 'Erro ao processar pagamento. Tente novamente.')
        return
      }

      router.push(
        `/billing/success?next=/${orgSlug}/default&planName=${selectedPlan.code ?? selectedPlan.slug}`,
      )
    } catch {
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleExpiryChange(value: string) {
    const formatted = formatExpiry(value)
    const digits = formatted.replace(/\D/g, '')
    setExpiryMonth(digits.slice(0, 2))
    setExpiryYear(digits.slice(2, 4))
  }

  const expiryDisplay = expiryMonth || expiryYear ? `${expiryMonth}/${expiryYear}`.replace(/\/$/, '') : ''

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <div className="relative h-8 w-32">
              <Image
                src="/images/logo/logo_transparent_dark_horizontal.png"
                alt="WhaTrack"
                fill
                className="object-contain"
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            14 dias grátis · Cancele quando quiser
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Ative seu plano</h1>
          <p className="mt-2 text-zinc-400">
            Seus primeiros 14 dias são grátis. Cobramos somente ao término do período.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Plan selector */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Escolha seu plano
            </h2>
            <div className="space-y-3">
              {basePlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        {plan.isHighlighted && (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                            Mais escolhido
                          </span>
                        )}
                      </div>
                      {plan.subtitle && (
                        <p className="mt-0.5 text-sm text-zinc-400">{plan.subtitle}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-2xl font-bold">
                        R${' '}
                        {plan.monthlyPrice.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-sm text-zinc-400">/mês</span>
                    </div>
                  </div>
                  {selectedPlan?.id === plan.id && plan.features.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card form */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Dados do cartão de crédito
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Nome impresso no cartão
                  </label>
                  <Input
                    placeholder="NOME SOBRENOME"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                    disabled={isSubmitting}
                    autoComplete="cc-name"
                    className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Número do cartão
                  </label>
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    disabled={isSubmitting}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Validade
                    </label>
                    <Input
                      placeholder="MM/AA"
                      value={expiryDisplay}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      disabled={isSubmitting}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      maxLength={5}
                      className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      CCV
                    </label>
                    <Input
                      placeholder="000"
                      value={ccv}
                      onChange={(e) => setCcv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      disabled={isSubmitting}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedPlan}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-70"
              >
                {isSubmitting
                  ? 'Processando...'
                  : `Ativar plano ${selectedPlan?.name ?? ''} · 14 dias grátis`}
              </Button>

              <p className="text-center text-xs text-zinc-500">
                Cobrança somente após os 14 dias de teste grátis · Cancele antes sem custo
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
