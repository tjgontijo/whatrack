'use client'

import { AlertCircle, TrendingDown, Users, MessageSquare } from 'lucide-react'
import { LandingContent } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

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
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative overflow-hidden bg-white py-32 dark:bg-zinc-950">
      {/* Diagonal background split */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/10 dark:to-orange-950/10" />
        <svg
          className="absolute left-0 top-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="problem-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(254, 242, 242)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(255, 237, 213)" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            d="M 50 0 L 100 0 L 100 100 L 30 100 Z"
            fill="url(#problem-gradient)"
            className="dark:opacity-10"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
              {content.badge}
            </span>
          </div>

          <h2 className="mb-6 font-geist text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            {content.headline}{' '}
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              {content.highlightedText}
            </span>
          </h2>

          <p className="text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            {content.subheadline}
          </p>
        </motion.div>

        {/* Problems grid - Asymmetric bento layout */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {content.problems.map((problem, i) => {
            const Icon = iconMap[problem.icon]
            const isLarge = i === 0 || i === 3
            const colSpan = isLarge ? 'md:col-span-2 lg:col-span-2' : ''

            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.2 + i * 0.1,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 ${colSpan} ${isLarge ? 'lg:p-12' : ''}`}
              >
                {/* Gradient accent */}
                <div
                  className={`pointer-events-none absolute ${i % 2 === 0 ? 'right-0 top-0' : 'bottom-0 left-0'
                    } h-32 w-32 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-transparent blur-2xl transition-transform group-hover:scale-150`}
                />

                {/* Icon */}
                <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50">
                  <Icon className="h-7 w-7 text-red-600 dark:text-red-500" />
                </div>

                {/* Content */}
                <h3
                  className={`relative mb-4 font-geist ${isLarge ? 'text-3xl' : 'text-2xl'} font-bold leading-tight text-zinc-900 dark:text-white`}
                >
                  {problem.title}
                </h3>

                <p
                  className={`relative ${isLarge ? 'text-lg' : 'text-base'} leading-relaxed text-zinc-600 dark:text-zinc-400`}
                >
                  {problem.description}
                </p>

                {/* Decorative corner */}
                <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full border-4 border-red-500/10 dark:border-red-500/20" />
              </motion.div>
            )
          })}
        </div>

        {/* Closing text */}
        {content.closingText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16 rounded-2xl border-l-4 border-red-500 bg-red-50 p-8 dark:bg-red-950/20"
          >
            <p className="text-lg italic leading-relaxed text-zinc-700 dark:text-zinc-300">
              "{content.closingText}"
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
