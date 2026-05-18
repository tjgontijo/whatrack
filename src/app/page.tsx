import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WhaTrack | Conecte seus anúncios Meta às vendas no WhatsApp',
  description:
    'O Meta entrega o lead no WhatsApp mas não sabe que você vendeu. O WhaTrack registra cada venda e devolve o dado ao algoritmo. CAC e ROAS reais, por campanha e anúncio.',
  openGraph: {
    title: 'WhaTrack | Conecte seus anúncios Meta às vendas no WhatsApp',
    description:
      'O Meta entrega o lead no WhatsApp mas não sabe que você vendeu. O WhaTrack registra cada venda e devolve o dado ao algoritmo. CAC e ROAS reais, por campanha e anúncio.',
    type: 'website',
  },
  keywords: [
    'rastreamento whatsapp',
    'meta ads whatsapp',
    'rastrear vendas whatsapp',
    'api conversão meta',
    'whatrack',
    'rastreamento leads whatsapp',
    'cac roas whatsapp',
  ],
}

import {
  LANDING_CONTENT,
  LandingComparison,
  LandingCTA,
  LandingFooter,
  LandingHeader,
  LandingHero,
  LandingHowItWorks,
  LandingPricing,
  LandingProblem,
  LandingSolution,
} from '@/components/landing'
import { listPublicBillingPlans } from '@/features/billing/services/billing-plan-catalog.service'

export default async function HomePage() {
  const content = LANDING_CONTENT.generic
  const plans = await listPublicBillingPlans()

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <LandingHeader variant='generic' />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingComparison />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant='generic' plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
