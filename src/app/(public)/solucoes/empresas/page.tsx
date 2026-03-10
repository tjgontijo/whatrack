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
  title: 'WhaTrack para Empresas | Saiba de onde vêm seus clientes',
  description:
    'Veja qual propaganda traz mais clientes para seu WhatsApp. Simples de usar, sem complicação. Teste grátis por 14 dias.',
  openGraph: {
    title: 'WhaTrack para Empresas | Saiba de onde vêm seus clientes',
    description:
      'Veja qual propaganda traz mais clientes para seu WhatsApp. Simples de usar, sem complicação.',
    type: 'website',
  },
}

export default async function EmpresasPage() {
  const content = LANDING_CONTENT.empresas
  const plans = await listPublicBillingPlans()

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <LandingHeader variant="empresas" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="empresas" plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
