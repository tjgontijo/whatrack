import { isPlanType, type PlanType } from '@/types/billing/billing'

type SupportLevel = 'email' | 'priority' | 'dedicated'

export interface BillingPlan {
  id: PlanType
  name: string
  subtitle: string
  description: string
  pricePrefix: string | null
  priceValue: string
  pricePeriod: string
  monthlyPrice: number
  monthlyPriceInCents: number
  eventLimitPerMonth: number
  overagePricePerEvent: number
  overageLabel: string | null
  maxWhatsAppNumbers: number
  maxAdAccounts: number
  maxTeamMembers: number
  supportLevel: SupportLevel
  features: readonly string[]
  additionals: readonly string[]
  highlighted: boolean
  contactSalesOnly: boolean
  cta: string
}

export const BILLING_CYCLE_DAYS = 30

export const BILLING_PLAN_ORDER = ['starter', 'pro', 'agency'] as const satisfies readonly PlanType[]

export const BILLING_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Até 200 eventos / mês',
    description: 'Para começar a rastrear suas vendas com clareza.',
    pricePrefix: 'R$',
    priceValue: '97',
    pricePeriod: '/mês',
    monthlyPrice: 97,
    monthlyPriceInCents: 9700,
    eventLimitPerMonth: 200,
    overagePricePerEvent: 0.25,
    overageLabel: 'R$ 0,25 por evento extra',
    maxWhatsAppNumbers: 1,
    maxAdAccounts: 1,
    maxTeamMembers: 2,
    supportLevel: 'email',
    features: [
      'Rastreamento de leads e purchases',
      '1 número de WhatsApp',
      '1 conta de anúncio',
      'Relatórios de vendas por campanha',
      'API de Conversão ativada',
    ],
    additionals: [],
    highlighted: false,
    contactSalesOnly: false,
    cta: 'Começar agora',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Até 500 eventos / mês',
    description: 'Para operações com mais volume e equipe.',
    pricePrefix: 'R$',
    priceValue: '197',
    pricePeriod: '/mês',
    monthlyPrice: 197,
    monthlyPriceInCents: 19700,
    eventLimitPerMonth: 500,
    overagePricePerEvent: 0.18,
    overageLabel: 'R$ 0,18 por evento extra',
    maxWhatsAppNumbers: 2,
    maxAdAccounts: 2,
    maxTeamMembers: 5,
    supportLevel: 'priority',
    features: [
      'Tudo do Starter',
      '2 números de WhatsApp',
      '2 contas de anúncio',
      'Múltiplos membros da equipe',
      'Relatórios de ROI em tempo real',
      'Suporte prioritário',
    ],
    additionals: ['Números adicionais: R$ 69/mês'],
    highlighted: true,
    contactSalesOnly: false,
    cta: 'Começar agora',
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    subtitle: 'Fluxo comercial sob consulta',
    description: 'Para agências e operações complexas com onboarding assistido.',
    pricePrefix: null,
    priceValue: 'Sob consulta',
    pricePeriod: '',
    monthlyPrice: 0,
    monthlyPriceInCents: 0,
    eventLimitPerMonth: 10000,
    overagePricePerEvent: 0.12,
    overageLabel: null,
    maxWhatsAppNumbers: 10,
    maxAdAccounts: 10,
    maxTeamMembers: 999,
    supportLevel: 'dedicated',
    features: [
      'Tudo do Pro',
      'Múltiplos números de WhatsApp',
      'Contas de anúncio personalizadas',
      'Onboarding assistido',
      'Suporte dedicado',
      'SLA sob contrato',
      'Integrações sob medida',
    ],
    additionals: [],
    highlighted: false,
    contactSalesOnly: true,
    cta: 'Falar com vendas',
  },
} as const satisfies Record<PlanType, BillingPlan>

export function getBillingPlan(planType: string): BillingPlan | null {
  if (!isPlanType(planType)) {
    return null
  }

  return BILLING_PLANS[planType]
}

export function getBillingPlanLabel(planType: string): string {
  return getBillingPlan(planType)?.name ?? planType
}
