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
  LandingHeader,
  LandingHero,
  LandingProblem,
  LandingSolution,
  LandingComparison,
  LandingHowItWorks,
  LandingPricing,
  LandingCTA,
  LandingFooter,
  LANDING_CONTENT,
} from '@/components/landing'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'

export default async function HomePage() {
  const content = LANDING_CONTENT.generic
  const plans = await listPublicBillingPlans()

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <LandingHeader variant="generic" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingComparison />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="generic" plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
