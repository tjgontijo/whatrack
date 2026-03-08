import { Metadata } from 'next'
import {
  LandingHeader,
  LandingHero,
  LandingProblem,
  LandingSolution,
  LandingHowItWorks,
  LandingPricing,
  LandingCTA,
  LandingFooter,
  LANDING_CONTENT,
} from '@/components/landing'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'

export const metadata: Metadata = {
  title: 'WhaTrack para Agências | Prove o ROI dos seus clientes',
  description:
    'Conecte os anúncios do seu cliente às vendas no WhatsApp. Mostre relatórios de ROI que ninguém questiona. Teste grátis por 7 dias.',
  openGraph: {
    title: 'WhaTrack para Agências | Prove o ROI dos seus clientes',
    description:
      'Conecte os anúncios do seu cliente às vendas no WhatsApp. Mostre relatórios de ROI que ninguém questiona.',
    type: 'website',
  },
}

export default async function AgenciasPage() {
  const content = LANDING_CONTENT.agencias
  const plans = await listPublicBillingPlans()

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <LandingHeader variant="agencias" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="agencias" plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
