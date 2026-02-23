import { CheckCircle2, BarChart3, Zap, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LandingContent } from './types'

const iconMap = {
  check: CheckCircle2,
  zap: Zap,
  chart: BarChart3,
  shield: Shield,
}

const colorClasses = {
  primary: {
    icon: 'bg-primary text-primary-foreground shadow-md',
    bg: 'bg-primary/5',
  },
  purple: {
    icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    bg: '',
  },
  amber: {
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    bg: '',
  },
  emerald: {
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    bg: 'bg-gradient-to-t from-emerald-500/5 to-transparent',
  },
}

interface LandingSolutionProps {
  content: LandingContent['solution']
}

export function LandingSolution({ content }: LandingSolutionProps) {
  return (
    <section id="solucao" className="bg-background relative py-24 sm:py-32">
      <div className="bg-primary/5 pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
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

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {content.cards.map((card, index) => {
            const Icon = iconMap[card.icon]
            const colors = colorClasses[card.color]
            const isLarge = card.size === 'large'
            const colSpan = isLarge ? 'lg:col-span-3' : 'lg:col-span-2'

            // Alternate large cards positions
            const orderClass = index === 0 ? '' : index === 3 ? 'lg:order-last' : ''

            return (
              <div
                key={card.title}
                className={`${colSpan} ${orderClass} border-border/60 dark:bg-card group relative overflow-hidden rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg sm:p-10`}
              >
                {colors.bg && (
                  <div
                    className={`absolute ${index === 0 ? 'right-0 top-0 h-64 w-64 rounded-bl-[100px]' : 'bottom-0 right-0 h-1/2 w-full'} ${colors.bg} pointer-events-none transition-transform group-hover:scale-105`}
                  />
                )}
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${colors.icon} relative z-10`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3
                  className={`mb-4 ${isLarge ? 'text-2xl' : 'text-xl'} text-foreground relative z-10 font-bold`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-muted-foreground ${isLarge ? 'text-base' : 'text-sm font-medium'} relative z-10 leading-relaxed ${isLarge ? 'max-w-md' : ''}`}
                >
                  {card.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
