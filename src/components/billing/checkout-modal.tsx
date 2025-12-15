'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, QrCode, FileText, Copy, Check, Loader2 } from 'lucide-react'

// Types
export interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthlyCents: number
  priceYearlyCents: number
}

export type PaymentInterval = 'monthly' | 'yearly'
export type BillingType = 'credit_card' | 'pix' | 'boleto'

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan
  interval: PaymentInterval
  onSuccess?: () => void
}

interface CheckoutResponse {
  subscription?: {
    id: string
    status: string
  }
  payment?: {
    id: string
    status: string
    pixQrCodeUrl?: string
    pixCopyPaste?: string
    boletoUrl?: string
    boletoBarcode?: string
  }
}

// Card form schema
const cardSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Número do cartão é obrigatório')
    .transform((val) => val.replace(/\s/g, ''))
    .refine((val) => /^\d{13,19}$/.test(val), 'Número do cartão inválido'),
  cardHolder: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome muito longo'),
  expiryMonth: z
    .string()
    .min(1, 'Mês obrigatório')
    .refine((val) => /^(0[1-9]|1[0-2])$/.test(val), 'Mês inválido (01-12)'),
  expiryYear: z
    .string()
    .min(1, 'Ano obrigatório')
    .refine((val) => /^\d{2}$/.test(val), 'Ano inválido (ex: 25)'),
  cvv: z
    .string()
    .min(1, 'CVV obrigatório')
    .refine((val) => /^\d{3,4}$/.test(val), 'CVV inválido'),
})

type CardFormData = z.infer<typeof cardSchema>

// Card brand detection
function detectCardBrand(cardNumber: string): string | null {
  const number = cardNumber.replace(/\s/g, '')
  if (/^4/.test(number)) return 'visa'
  if (/^5[1-5]/.test(number)) return 'mastercard'
  if (/^3[47]/.test(number)) return 'amex'
  if (/^6(?:011|5)/.test(number)) return 'discover'
  if (/^(?:636368|438935|504175|451416|636297)/.test(number)) return 'elo'
  if (/^(606282|3841)/.test(number)) return 'hipercard'
  return null
}

// Format card number with spaces
function formatCardNumber(value: string): string {
  const number = value.replace(/\D/g, '')
  const parts = number.match(/.{1,4}/g) ?? []
  return parts.join(' ').slice(0, 19)
}

// Format currency
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

// Credit Card Form Component
function CreditCardForm({
  onSubmit,
  isProcessing,
}: {
  onSubmit: (data: CardFormData) => void
  isProcessing: boolean
}) {
  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardNumber: '',
      cardHolder: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
    },
  })

  const cardNumber = form.watch('cardNumber')
  const cardBrand = detectCardBrand(cardNumber)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Cartão</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value)
                      field.onChange(formatted)
                    }}
                  />
                  {cardBrand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium uppercase text-muted-foreground">
                      {cardBrand}
                    </span>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cardHolder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome no Cartão</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="expiryMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mês</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="MM"
                    maxLength={2}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="AA"
                    maxLength={2}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cvv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CVV</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="123"
                    maxLength={4}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Assinar'
          )}
        </Button>
      </form>
    </Form>
  )
}

// PIX Payment Component
function PixPayment({
  pixData,
  onGenerate,
  isProcessing,
}: {
  pixData: { qrCodeUrl: string; copyPaste: string } | null
  onGenerate: () => void
  isProcessing: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!pixData?.copyPaste) return
    await navigator.clipboard.writeText(pixData.copyPaste)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  if (!pixData) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-dashed p-8">
          <QrCode className="mx-auto h-16 w-16 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Clique no botão abaixo para gerar o QR Code PIX
          </p>
        </div>
        <Button onClick={onGenerate} className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PIX...
            </>
          ) : (
            'Gerar QR Code PIX'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="rounded-lg border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pixData.qrCodeUrl}
            alt="QR Code PIX"
            className="h-48 w-48"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Código PIX Copia e Cola</Label>
        <div className="flex gap-2">
          <Input
            value={pixData.copyPaste}
            readOnly
            className="font-mono text-xs"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Escaneie o QR Code ou copie o código para pagar via PIX.
        <br />O pagamento será confirmado automaticamente.
      </p>
    </div>
  )
}

// Boleto Payment Component
function BoletoPayment({
  boletoData,
  onGenerate,
  isProcessing,
}: {
  boletoData: { url: string; barcode: string } | null
  onGenerate: () => void
  isProcessing: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!boletoData?.barcode) return
    await navigator.clipboard.writeText(boletoData.barcode)
    setCopied(true)
    toast.success('Código de barras copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  if (!boletoData) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-dashed p-8">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Clique no botão abaixo para gerar o boleto bancário
          </p>
        </div>
        <Button onClick={onGenerate} className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando Boleto...
            </>
          ) : (
            'Gerar Boleto'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4 text-center">
        <FileText className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-2 font-medium">Boleto gerado com sucesso!</p>
      </div>

      <div className="space-y-2">
        <Label>Código de Barras</Label>
        <div className="flex gap-2">
          <Input
            value={boletoData.barcode}
            readOnly
            className="font-mono text-xs"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Button asChild className="w-full">
        <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
          <FileText className="mr-2 h-4 w-4" />
          Visualizar Boleto
        </a>
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        O boleto pode levar até 3 dias úteis para compensação.
      </p>
    </div>
  )
}

// Main Checkout Modal Component
export function CheckoutModal({
  open,
  onOpenChange,
  plan,
  interval,
  onSuccess,
}: CheckoutModalProps) {
  const queryClient = useQueryClient()
  const [billingType, setBillingType] = useState<BillingType>('credit_card')
  const [pixData, setPixData] = useState<{ qrCodeUrl: string; copyPaste: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barcode: string } | null>(null)

  const price = interval === 'monthly' ? plan.priceMonthlyCents : plan.priceYearlyCents
  const intervalLabel = interval === 'monthly' ? 'mês' : 'ano'

  const checkoutMutation = useMutation({
    mutationFn: async (cardData?: CardFormData) => {
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          interval,
          billingType,
          ...(billingType === 'credit_card' && cardData
            ? {
                cardToken: JSON.stringify({
                  number: cardData.cardNumber.replace(/\s/g, ''),
                  holderName: cardData.cardHolder,
                  expiryMonth: cardData.expiryMonth,
                  expiryYear: `20${cardData.expiryYear}`,
                  cvv: cardData.cvv,
                }),
              }
            : {}),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error ?? 'Erro ao processar pagamento')
      }

      return response.json() as Promise<CheckoutResponse>
    },
    onSuccess: (data) => {
      if (billingType === 'pix' && data.payment?.pixQrCodeUrl) {
        setPixData({
          qrCodeUrl: data.payment.pixQrCodeUrl,
          copyPaste: data.payment.pixCopyPaste ?? '',
        })
      } else if (billingType === 'boleto' && data.payment?.boletoUrl) {
        setBoletoData({
          url: data.payment.boletoUrl,
          barcode: data.payment.boletoBarcode ?? '',
        })
      } else {
        // Credit card success
        toast.success('Assinatura realizada com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['billing'] })
        onOpenChange(false)
        onSuccess?.()
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCardSubmit = (data: CardFormData) => {
    checkoutMutation.mutate(data)
  }

  const handlePixGenerate = () => {
    setBillingType('pix')
    checkoutMutation.mutate(undefined)
  }

  const handleBoletoGenerate = () => {
    setBillingType('boleto')
    checkoutMutation.mutate(undefined)
  }

  const handleTabChange = (value: string) => {
    setBillingType(value as BillingType)
    // Reset payment data when switching tabs
    setPixData(null)
    setBoletoData(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assinar {plan.name}</DialogTitle>
          <DialogDescription>
            {formatCurrency(price)}/{intervalLabel}
            {plan.description && ` - ${plan.description}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={billingType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credit_card" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Cartão</span>
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">PIX</span>
            </TabsTrigger>
            <TabsTrigger value="boleto" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Boleto</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credit_card" className="mt-4">
            <CreditCardForm
              onSubmit={handleCardSubmit}
              isProcessing={checkoutMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="pix" className="mt-4">
            <PixPayment
              pixData={pixData}
              onGenerate={handlePixGenerate}
              isProcessing={checkoutMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="boleto" className="mt-4">
            <BoletoPayment
              boletoData={boletoData}
              onGenerate={handleBoletoGenerate}
              isProcessing={checkoutMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
