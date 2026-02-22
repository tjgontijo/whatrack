import { AlertCircle, TrendingDown, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LandingContent } from "./types";

const iconMap = {
  message: MessageSquare,
  trending: TrendingDown,
  users: Users,
  alert: AlertCircle,
};

interface LandingProblemProps {
  content: LandingContent["problem"];
}

export function LandingProblem({ content }: LandingProblemProps) {
  return (
    <section
      id="problema"
      className="relative bg-[#f8f9fa] dark:bg-muted/10 border-y border-border/50 py-24 sm:py-32 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0 relative z-10">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-destructive/10 text-destructive border-transparent px-4 py-1.5 uppercase tracking-widest text-xs font-bold"
          >
            {content.badge}
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight max-w-3xl mx-auto">
            {content.headline}{" "}
            <span className="text-destructive">{content.highlightedText}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground font-medium mt-4">
            {content.subheadline}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-12">
          {content.problems.map((problem) => {
            const Icon = iconMap[problem.icon];
            return (
              <div
                key={problem.title}
                className="bg-white dark:bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 relative group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 relative z-10">
                  <Icon className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground relative z-10 leading-tight">
                  {problem.title}
                </h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed relative z-10">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>

        {content.closingText && (
          <p className="mt-12 text-center text-lg text-muted-foreground max-w-3xl mx-auto font-medium italic">
            {content.closingText}
          </p>
        )}
      </div>
    </section>
  );
}
