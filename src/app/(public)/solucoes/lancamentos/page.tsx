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
  title: 'WhaTrack para Lançadores | ROI em tempo real no seu lançamento',
  description:
    'Rastreie do clique no anúncio até o fechamento no WhatsApp. Veja o ROI durante o carrinho aberto. Teste grátis por 7 dias.',
  openGraph: {
    title: 'WhaTrack para Lançadores | ROI em tempo real no seu lançamento',
    description:
      'Rastreie do clique no anúncio até o fechamento no WhatsApp. Veja o ROI durante o carrinho aberto.',
    type: 'website',
  },
}

export default async function LancamentosPage() {
  const content = LANDING_CONTENT.lancadores
  const plans = await listPublicBillingPlans()

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <LandingHeader variant="lancadores" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="lancadores" plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
