import { CheckCircle2, BarChart3, Zap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LandingContent } from "./types";

const iconMap = {
  check: CheckCircle2,
  zap: Zap,
  chart: BarChart3,
  shield: Shield,
};

const colorClasses = {
  primary: {
    icon: "bg-primary text-primary-foreground shadow-md",
    bg: "bg-primary/5",
  },
  purple: {
    icon: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    bg: "",
  },
  amber: {
    icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    bg: "",
  },
  emerald: {
    icon: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    bg: "bg-gradient-to-t from-emerald-500/5 to-transparent",
  },
};

interface LandingSolutionProps {
  content: LandingContent["solution"];
}

export function LandingSolution({ content }: LandingSolutionProps) {
  return (
    <section id="solucao" className="relative bg-background py-24 sm:py-32">
      <div className="absolute inset-0 bg-primary/5 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-12">
          {content.cards.map((card, index) => {
            const Icon = iconMap[card.icon];
            const colors = colorClasses[card.color];
            const isLarge = card.size === "large";
            const colSpan = isLarge ? "lg:col-span-3" : "lg:col-span-2";

            // Alternate large cards positions
            const orderClass =
              index === 0
                ? ""
                : index === 3
                  ? "lg:order-last"
                  : "";

            return (
              <div
                key={card.title}
                className={`${colSpan} ${orderClass} rounded-2xl border border-border/60 bg-white dark:bg-card p-8 sm:p-10 shadow-sm transition hover:shadow-lg relative overflow-hidden group`}
              >
                {colors.bg && (
                  <div
                    className={`absolute ${index === 0 ? "top-0 right-0 w-64 h-64 rounded-bl-[100px]" : "bottom-0 right-0 w-full h-1/2"} ${colors.bg} pointer-events-none transition-transform group-hover:scale-105`}
                  />
                )}
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${colors.icon} relative z-10`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3
                  className={`mb-4 ${isLarge ? "text-2xl" : "text-xl"} font-bold text-foreground relative z-10`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-muted-foreground ${isLarge ? "text-base" : "text-sm font-medium"} leading-relaxed relative z-10 ${isLarge ? "max-w-md" : ""}`}
                >
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
