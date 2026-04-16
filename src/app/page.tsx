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
