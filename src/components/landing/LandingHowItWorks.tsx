'use client'

import { Plug, Database, TrendingUp } from 'lucide-react'
import { LandingContent } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

const iconMap = {
  plug: Plug,
  database: Database,
  trending: TrendingUp,
}

interface LandingHowItWorksProps {
  content: LandingContent['howItWorks']
}

export function LandingHowItWorks({ content }: LandingHowItWorksProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="como-funciona"
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-b from-zinc-50 to-white py-32 dark:from-zinc-900 dark:to-zinc-950"
    >
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-0 top-1/4 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute left-0 top-3/4 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {content.badge}
            </span>
          </div>

          <h2 className="mx-auto mb-6 max-w-4xl font-geist text-5xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            {content.headline}{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
              {content.highlightedText}
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            {content.subheadline}
          </p>
        </motion.div>

        {/* Steps with flow visualization */}
        <div className="relative">
          {/* Connecting flow line */}
          <div className="absolute left-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 lg:block">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20" />
          </div>

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {content.steps.map((step, index) => {
              const Icon = iconMap[step.icon]
              const stepNumber = String(index + 1).padStart(2, '0')

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    delay: 0.2 + index * 0.2,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative"
                >
                  {/* Step card */}
                  <div className="relative rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 lg:p-10">
                    {/* Gradient accent */}
                    <div
                      className={`pointer-events-none absolute right-0 top-0 h-40 w-40 bg-gradient-to-bl opacity-0 blur-3xl transition-opacity group-hover:opacity-100 ${
                        index === 0
                          ? 'from-emerald-500/30'
                          : index === 1
                            ? 'from-amber-500/30'
                            : 'from-emerald-500/30'
                      } to-transparent`}
                    />

                    {/* Icon and step number */}
                    <div className="relative mb-8 flex items-center justify-between">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${
                          index === 0
                            ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/25'
                            : index === 1
                              ? 'from-amber-500 to-amber-600 shadow-amber-500/25'
                              : 'from-emerald-600 to-teal-600 shadow-emerald-500/25'
                        }`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>

                      <span className="select-none font-mono text-7xl font-black text-zinc-100 dark:text-zinc-900">
                        {stepNumber}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 className="relative mb-4 font-geist text-2xl font-bold leading-tight text-zinc-900 dark:text-white">
                      {step.title}
                    </h3>

                    <p className="relative text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {step.description}
                    </p>

                    {/* Progress indicator */}
                    <div className="mt-8 flex items-center gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= index
                              ? 'bg-emerald-500'
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Arrow connector for desktop */}
                  {index < content.steps.length - 1 && (
                    <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{
                          delay: 0.6 + index * 0.2,
                          duration: 0.6,
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md dark:bg-zinc-900"
                      >
                        <svg
                          className="h-5 w-5 text-emerald-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
