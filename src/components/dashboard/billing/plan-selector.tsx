'use client'

import { useMemo, useState } from 'react'
import { Check, CreditCard, Loader2, QrCode } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils/utils'
import { useOrganization } from '@/hooks/organization/use-organization'
import type { PublicBillingPlan } from '@/schemas/billing/billing-plan-schemas'
import { CheckoutPixQrcode } from './checkout-pix-qrcode'
import { CheckoutStatusTokenService } from '@/services/billing/checkout-status-token.service'

type CheckoutState = 'idle' | 'loading'
type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'PIX_AUTOMATIC'

type CheckoutResult = {
  invoiceId?: string | null
  paymentMethod: PaymentMethod
  pix?: {
    qrCodePayload: string
    qrCodeImage?: string | null
    expirationDate?: string | null
  } | null
  pixAutomatic?: {
    authorizationId: string
    qrCodePayload: string
    qrCodeImage?: string | null
    expirationDate?: string | null
  } | null
}

interface PlanSelectorProps {
  plans: PublicBillingPlan[]
  onClose?: () => void
  redirectPath?: string
  showHeader?: boolean
}

function getAvailablePaymentMethods(plan: PublicBillingPlan): PaymentMethod[] {
  return plan.offers.map((offer) => offer.paymentMethod)
}

function getDefaultPaymentMethod(plan: PublicBillingPlan): PaymentMethod {
  const methods = getAvailablePaymentMethods(plan)
  return methods.includes('CREDIT_CARD') ? 'CREDIT_CARD' : methods[0]
}

export function PlanSelector({
  plans,
  showHeader = true,
}: PlanSelectorProps) {
  const { data: org } = useOrganization()
  const basePlans = plans.filter((plan) => plan.kind === 'base')
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(basePlans[0]?.code ?? 'monthly')
  const selectedPlan = useMemo(
    () => basePlans.find((plan) => (plan.code ?? plan.slug) === selectedPlanCode) ?? basePlans[0],
    [basePlans, selectedPlanCode],
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    selectedPlan ? getDefaultPaymentMethod(selectedPlan) : 'CREDIT_CARD',
  )
  const [installments, setInstallments] = useState('1')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [holderName, setHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [ccv, setCcv] = useState('')
  const [state, setState] = useState<CheckoutState>('idle')
  const [result, setResult] = useState<CheckoutResult | null>(null)

  if (!selectedPlan) {
    return null
  }

  const availableMethods = getAvailablePaymentMethods(selectedPlan)
  const selectedOffer = selectedPlan.offers.find((offer) => offer.paymentMethod === paymentMethod)
  const isCreditCard = paymentMethod === 'CREDIT_CARD'
  const maxInstallments = selectedOffer?.maxInstallments ?? 1

  async function handleSubmit() {
    if (!org?.id) {
      toast.error('Selecione uma organização primeiro')
      return
    }

    if (!cpfCnpj.trim()) {
      toast.error('Informe CPF ou CNPJ')
      return
    }

    if (isCreditCard && (!holderName || !cardNumber || !expiryMonth || !expiryYear || !ccv)) {
      toast.error('Preencha os dados do cartão')
      return
    }

    setState('loading')
    setResult(null)

    try {
      const data = (await apiFetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: selectedPlan.code ?? selectedPlan.slug,
          paymentMethod,
          cpfCnpj,
          installments: Number(installments),
          creditCard: isCreditCard
            ? {
                holderName,
                number: cardNumber,
                expiryMonth,
                expiryYear,
                ccv,
              }
            : undefined,
        }),
        orgId: org.id,
      })) as CheckoutResult

      setResult(data)
      toast.success(
        paymentMethod === 'CREDIT_CARD'
          ? 'Checkout enviado'
          : paymentMethod === 'PIX_AUTOMATIC'
            ? 'Autorize o PIX Automático para concluir'
            : 'PIX gerado com sucesso',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar checkout')
    } finally {
      setState('idle')
    }
  }

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contratar plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cartão de crédito é o fluxo principal. PIX automático fica disponível no mensal e PIX comum no anual.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {basePlans.map((plan, index) => {
          const planCode = plan.code ?? plan.slug
          const isSelected = planCode === selectedPlanCode

          return (
            <motion.button
              key={plan.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => {
                setSelectedPlanCode(planCode)
                setPaymentMethod(getDefaultPaymentMethod(plan))
                setInstallments('1')
                setResult(null)
              }}
              className={cn(
                'rounded-lg border p-5 text-left transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>
                {isSelected ? (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Selecionado
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className="text-3xl font-semibold text-foreground">
                  {selectedPlan.code === planCode && selectedOffer
                    ? selectedOffer.amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    : plan.monthlyPrice.toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{plan.code === 'annual' ? 'ano' : 'mês'}
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.button>
          )
        })}
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billing-method">Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value as PaymentMethod)
                setInstallments('1')
                setResult(null)
              }}
            >
              <SelectTrigger id="billing-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.includes('CREDIT_CARD') ? (
                  <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                ) : null}
                {availableMethods.includes('PIX_AUTOMATIC') ? (
                  <SelectItem value="PIX_AUTOMATIC">PIX Automático</SelectItem>
                ) : null}
                {availableMethods.includes('PIX') ? <SelectItem value="PIX">PIX anual</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf-cnpj">CPF ou CNPJ</Label>
            <Input
              id="cpf-cnpj"
              value={cpfCnpj}
              onChange={(event) => setCpfCnpj(event.target.value)}
              placeholder="Somente números"
            />
          </div>

          {isCreditCard ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="holder-name">Nome no cartão</Label>
                <Input
                  id="holder-name"
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  placeholder="Nome como está no cartão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-number">Número do cartão</Label>
                <Input
                  id="card-number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder="0000 0000 0000 0000"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="expiry-month">Mês</Label>
                  <Input
                    id="expiry-month"
                    value={expiryMonth}
                    onChange={(event) => setExpiryMonth(event.target.value)}
                    placeholder="MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry-year">Ano</Label>
                  <Input
                    id="expiry-year"
                    value={expiryYear}
                    onChange={(event) => setExpiryYear(event.target.value)}
                    placeholder="AAAA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-ccv">CCV</Label>
                  <Input
                    id="card-ccv"
                    value={ccv}
                    onChange={(event) => setCcv(event.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              {selectedPlan.code === 'annual' && maxInstallments > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <Select value={installments} onValueChange={setInstallments}>
                    <SelectTrigger id="installments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxInstallments }, (_, index) => (
                        <SelectItem key={index + 1} value={String(index + 1)}>
                          {index + 1}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedPlan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {paymentMethod === 'CREDIT_CARD'
                  ? 'Cobrança principal do MVP com checkout transparente.'
                  : paymentMethod === 'PIX_AUTOMATIC'
                    ? 'Autoriza o débito recorrente via PIX e gera um QR Code inicial.'
                    : 'Gera um PIX avulso para pagamento anual.'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {selectedOffer
                  ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: selectedOffer.currency,
                    }).format(selectedOffer.amount)
                  : 'R$ 0,00'}
              </p>
            </div>

            {result?.pix && result.invoiceId ? (
              <CheckoutPixQrcode
                qrCodeImage={result.pix.qrCodeImage ?? null}
                qrCodePayload={result.pix.qrCodePayload}
                expirationDate={result.pix.expirationDate ?? null}
                invoiceId={result.invoiceId}
                statusToken={CheckoutStatusTokenService.createInvoiceToken(result.invoiceId)}
                type="pix"
              />
            ) : null}

            {result?.pixAutomatic ? (
              <CheckoutPixQrcode
                qrCodeImage={result.pixAutomatic.qrCodeImage ?? null}
                qrCodePayload={result.pixAutomatic.qrCodePayload}
                expirationDate={result.pixAutomatic.expirationDate ?? null}
                invoiceId={result.pixAutomatic.authorizationId}
                statusToken={CheckoutStatusTokenService.createAuthorizationToken(
                  result.pixAutomatic.authorizationId,
                )}
                type="pix_automatic"
              />
            ) : null}
          </div>

          <Button onClick={handleSubmit} disabled={state === 'loading'} className="mt-4 w-full">
            {state === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Continuar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
