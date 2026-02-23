import { Plug, Database, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LandingContent } from './types'

const iconMap = {
  plug: Plug,
  database: Database,
  trending: TrendingUp,
}

interface LandingHowItWorksProps {
  content: LandingContent['howItWorks']
}

export function LandingHowItWorks({ content }: LandingHowItWorksProps) {
  return (
    <section
      id="como-funciona"
      className="dark:bg-muted/10 border-border/50 border-y bg-[#f8f9fa] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary mx-auto border-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
          >
            {content.badge}
          </Badge>
          <h2 className="text-foreground mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {content.headline} <span className="text-primary">{content.highlightedText}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg font-medium">
            {content.subheadline}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {content.steps.map((step, index) => {
            const Icon = iconMap[step.icon]
            const stepNumber = String(index + 1).padStart(2, '0')

            return (
              <div key={step.title} className="group relative">
                {/* Connector line on desktop */}
                {index < content.steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 items-center lg:flex">
                    <div className="from-border h-px w-full bg-gradient-to-r to-transparent" />
                  </div>
                )}

                <div className="dark:bg-card border-border/60 relative z-10 flex h-full flex-col items-start rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
                  <div className="mb-6 flex w-full items-center justify-between">
                    <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-transform group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-muted/30 select-none text-5xl font-black">
                      {stepNumber}
                    </span>
                  </div>

                  <h3 className="text-foreground mb-3 text-xl font-bold leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
