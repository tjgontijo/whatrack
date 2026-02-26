'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingContent } from './types'
import { motion } from 'motion/react'

interface LandingHeroProps {
  content: LandingContent['hero']
}

export function LandingHero({ content }: LandingHeroProps) {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#0a0a0a] text-white">
      {/* Sophisticated gradient mesh background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tl from-amber-500/15 via-amber-600/5 to-transparent blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500/10 to-amber-500/10 blur-3xl" />

        {/* Subtle grain texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-6 pb-24 pt-32 sm:px-8 lg:grid-cols-2 lg:gap-24 lg:px-12 lg:pt-40">
        {/* Left column - Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium tracking-wide text-emerald-100">
              {content.badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 font-geist text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          >
            {content.headline}{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              {content.highlightedText}
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-10 text-lg leading-relaxed text-zinc-300 sm:text-xl lg:text-2xl"
          >
            {content.subheadline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col gap-4 sm:flex-row sm:gap-6"
          >
            <Button
              size="lg"
              className="group h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
              asChild
            >
              <Link href="/sign-up">
                {content.ctaPrimary}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-zinc-700 bg-zinc-900/50 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-800/50"
              asChild
            >
              <Link href="#como-funciona">{content.ctaSecondary}</Link>
            </Button>
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-12 flex flex-wrap gap-6 text-sm text-zinc-400"
          >
            {content.highlights.map((highlight, i) => (
              <motion.div
                key={highlight}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium">{highlight}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right column - Premium Dashboard Visualization */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center lg:justify-end"
        >
          {/* Glow effect behind dashboard */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-amber-500/20 blur-3xl" />

          {/* Dashboard mockup */}
          <div className="relative w-full max-w-2xl">
            {/* Window chrome */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
              {/* Top bar */}
              <div className="flex h-12 items-center gap-2 border-b border-zinc-800 bg-zinc-900/90 px-4">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>

              {/* Dashboard content */}
              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8">
                {/* Stats cards */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {[
                    { label: 'ROI', value: '847%', color: 'emerald' },
                    { label: 'Vendas', value: '142', color: 'amber' },
                    { label: 'CAC', value: 'R$ 24', color: 'blue' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                    >
                      <div className="mb-2 text-xs font-medium text-zinc-500">
                        {stat.label}
                      </div>
                      <div
                        className={`font-mono text-2xl font-bold ${
                          stat.color === 'emerald'
                            ? 'text-emerald-400'
                            : stat.color === 'amber'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                        }`}
                      >
                        {stat.value}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart visualization */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3, duration: 0.8 }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-200">
                      Receita por Campanha
                    </div>
                    <div className="text-xs text-zinc-500">Últimos 7 dias</div>
                  </div>

                  {/* Bar chart */}
                  <div className="flex h-32 items-end gap-2">
                    {[0.3, 0.6, 0.4, 0.8, 0.5, 1, 0.7].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height * 100}%` }}
                        transition={{
                          delay: 1.5 + i * 0.05,
                          duration: 0.6,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{
                          boxShadow: '0 -4px 20px rgba(16, 185, 129, 0.3)',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Revenue indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 0.6 }}
                  className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <div className="text-sm font-medium text-zinc-300">
                    Receita Total
                  </div>
                  <div className="font-mono text-xl font-bold text-emerald-400">
                    R$ 87.420
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.6 }}
              className="absolute -bottom-4 -left-4 rounded-full border border-emerald-500/20 bg-zinc-900/90 px-6 py-3 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-white">
                  Dados em tempo real
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/50 to-transparent dark:from-zinc-950 dark:via-zinc-950/50" />
    </section>
  )
}
