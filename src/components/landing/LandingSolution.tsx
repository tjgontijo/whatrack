'use client'

import { CheckCircle2, BarChart3, Zap, Shield } from 'lucide-react'
import { LandingContent } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

const iconMap = {
  check: CheckCircle2,
  zap: Zap,
  chart: BarChart3,
  shield: Shield,
}

interface LandingSolutionProps {
  content: LandingContent['solution']
}

export function LandingSolution({ content }: LandingSolutionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-b from-white to-zinc-50 py-32 dark:from-zinc-950 dark:to-zinc-900"
    >
      {/* Sophisticated background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="solution-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-zinc-200 dark:text-zinc-800"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#solution-grid)" />
        </svg>
      </div>

      {/* Radial gradient accent */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {content.badge}
            </span>
          </div>

          <h2 className="mx-auto mb-6 max-w-4xl font-geist text-5xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            {content.headline}{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
              {content.highlightedText}
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            {content.subheadline}
          </p>
        </motion.div>

        {/* Bento grid - Asymmetric layout */}
        <div className="grid gap-6 md:grid-cols-6 lg:gap-8">
          {content.cards.map((card, i) => {
            const Icon = iconMap[card.icon]
            const isLarge = card.size === 'large'

            // Complex grid positioning for visual interest
            const gridClass =
              i === 0
                ? 'md:col-span-4'
                : i === 1
                  ? 'md:col-span-2'
                  : i === 2
                    ? 'md:col-span-3'
                    : 'md:col-span-3'

            // Color schemes based on card color
            const colorSchemes = {
              primary: {
                border: 'border-emerald-200 dark:border-emerald-900/50',
                bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
                icon: 'bg-emerald-600 dark:bg-emerald-500',
                iconContainer:
                  'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900',
                glow: 'from-emerald-500/20 to-transparent',
                text: 'text-emerald-700 dark:text-emerald-400',
              },
              purple: {
                border: 'border-purple-200 dark:border-purple-900/50',
                bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
                icon: 'bg-purple-600 dark:bg-purple-500',
                iconContainer:
                  'bg-purple-100 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900',
                glow: 'from-purple-500/20 to-transparent',
                text: 'text-purple-700 dark:text-purple-400',
              },
              amber: {
                border: 'border-amber-200 dark:border-amber-900/50',
                bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
                icon: 'bg-amber-600 dark:bg-amber-500',
                iconContainer:
                  'bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900',
                glow: 'from-amber-500/20 to-transparent',
                text: 'text-amber-700 dark:text-amber-400',
              },
              emerald: {
                border: 'border-emerald-200 dark:border-emerald-900/50',
                bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
                icon: 'bg-emerald-600 dark:bg-emerald-500',
                iconContainer:
                  'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900',
                glow: 'from-emerald-500/20 via-teal-500/20 to-transparent',
                text: 'text-emerald-700 dark:text-emerald-400',
              },
            }

            const colors = colorSchemes[card.color]

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{
                  delay: 0.2 + i * 0.15,
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`group relative overflow-hidden rounded-3xl border backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl ${gridClass} ${colors.border} ${colors.bg} ${isLarge ? 'p-10 lg:p-12' : 'p-8'}`}
              >
                {/* Gradient glow on hover */}
                <div
                  className={`pointer-events-none absolute right-0 top-0 h-64 w-64 bg-gradient-to-bl opacity-0 blur-3xl transition-opacity group-hover:opacity-100 ${colors.glow}`}
                />

                {/* Icon with sophisticated styling */}
                <div className="relative mb-6">
                  <div
                    className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl border ${colors.iconContainer}`}
                  >
                    <Icon className={`h-8 w-8 text-white ${colors.icon}`} />
                  </div>

                  {/* Decorative dot pattern */}
                  <div className="absolute -right-2 -top-2 grid grid-cols-2 gap-1 opacity-20">
                    {[...Array(4)].map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 w-1 rounded-full ${colors.icon}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <h3
                  className={`relative mb-4 font-geist font-bold leading-tight text-zinc-900 dark:text-white ${isLarge ? 'text-3xl lg:text-4xl' : 'text-2xl'}`}
                >
                  {card.title}
                </h3>

                <p
                  className={`relative leading-relaxed text-zinc-700 dark:text-zinc-300 ${isLarge ? 'text-lg' : 'text-base'}`}
                >
                  {card.description}
                </p>

                {/* Decorative corner element */}
                {isLarge && (
                  <div
                    className={`absolute -bottom-8 -right-8 h-32 w-32 rounded-full border-8 opacity-10 ${colors.border}`}
                  />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Sparkles icon component (since it's not in lucide-react by default)
function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
