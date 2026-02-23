import { AlertCircle, TrendingDown, Users, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LandingContent } from './types'

const iconMap = {
  message: MessageSquare,
  trending: TrendingDown,
  users: Users,
  alert: AlertCircle,
}

interface LandingProblemProps {
  content: LandingContent['problem']
}

export function LandingProblem({ content }: LandingProblemProps) {
  return (
    <section
      id="problema"
      className="dark:bg-muted/10 border-border/50 relative overflow-hidden border-y bg-[#f8f9fa] py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-destructive/10 text-destructive border-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
          >
            {content.badge}
          </Badge>
          <h2 className="text-foreground mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {content.headline} <span className="text-destructive">{content.highlightedText}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg font-medium">
            {content.subheadline}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.problems.map((problem) => {
            const Icon = iconMap[problem.icon]
            return (
              <div
                key={problem.title}
                className="dark:bg-card border-border/60 group relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="bg-destructive/5 pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full transition-transform group-hover:scale-110" />
                <div className="bg-destructive/10 border-destructive/20 relative z-10 mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border">
                  <Icon className="text-destructive h-7 w-7" />
                </div>
                <h3 className="text-foreground relative z-10 mb-3 text-xl font-bold leading-tight">
                  {problem.title}
                </h3>
                <p className="text-muted-foreground relative z-10 text-sm font-medium leading-relaxed">
                  {problem.description}
                </p>
              </div>
            )
          })}
        </div>

        {content.closingText && (
          <p className="text-muted-foreground mx-auto mt-12 max-w-3xl text-center text-lg font-medium italic">
            {content.closingText}
          </p>
        )}
      </div>
    </section>
  )
}
