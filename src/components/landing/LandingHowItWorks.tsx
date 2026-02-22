import { Plug, Database, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LandingContent } from "./types";

const iconMap = {
  plug: Plug,
  database: Database,
  trending: TrendingUp,
};

interface LandingHowItWorksProps {
  content: LandingContent["howItWorks"];
}

export function LandingHowItWorks({ content }: LandingHowItWorksProps) {
  return (
    <section
      id="como-funciona"
      className="bg-[#f8f9fa] dark:bg-muted/10 border-y border-border/50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="mx-auto bg-primary/10 text-primary border-transparent px-4 py-1.5 uppercase tracking-widest text-xs font-bold"
          >
            {content.badge}
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight max-w-2xl mx-auto">
            {content.headline}{" "}
            <span className="text-primary">{content.highlightedText}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground font-medium mt-4">
            {content.subheadline}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 mt-16">
          {content.steps.map((step, index) => {
            const Icon = iconMap[step.icon];
            const stepNumber = String(index + 1).padStart(2, "0");

            return (
              <div key={step.title} className="relative group">
                {/* Connector line on desktop */}
                {index < content.steps.length - 1 && (
                  <div className="absolute right-0 top-12 hidden w-full translate-x-1/2 items-center lg:flex pointer-events-none">
                    <div className="h-px w-full bg-gradient-to-r from-border to-transparent" />
                  </div>
                )}

                <div className="flex flex-col items-start bg-white dark:bg-card p-8 rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-lg relative z-10 h-full">
                  <div className="mb-6 flex items-center justify-between w-full">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-5xl font-black text-muted/30 select-none">
                      {stepNumber}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-foreground leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
