'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingContent } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

interface LandingCTAProps {
  content: LandingContent['cta']
}

export function LandingCTA({ content }: LandingCTAProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-amber-500 py-32"
    >
      {/* Sophisticated background elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial gradients */}
        <div className="absolute -top-40 left-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-white/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-amber-500/20 to-transparent blur-3xl" />

        {/* Geometric patterns */}
        <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="cta-pattern"
              x="0"
              y="0"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="50" cy="50" r="1" fill="white" />
              <circle cx="0" cy="0" r="1" fill="white" />
              <circle cx="100" cy="100" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-pattern)" />
        </svg>

        {/* Grain texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center sm:px-8 lg:px-12">
        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
        >
          <Sparkles className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold text-white">
            Mais de 500 empresas já transformaram suas vendas
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 font-geist text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          {content.headline}
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-white/90 sm:text-2xl"
        >
          {content.subheadline}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
        >
          <Button
            size="lg"
            className="group h-16 bg-white px-10 text-lg font-bold text-emerald-600 shadow-2xl shadow-black/20 transition-all hover:-translate-y-1 hover:shadow-3xl"
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
            className="h-16 border-2 border-white/30 bg-white/10 px-10 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            asChild
          >
            <Link href="#planos">{content.ctaSecondary}</Link>
          </Button>
        </motion.div>

        {/* Microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-8 text-sm font-medium text-white/80"
        >
          {content.microcopy}
        </motion.p>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/60"
        >
          {['✓ Sem cartão de crédito', '✓ 7 dias grátis', '✓ Cancele quando quiser'].map(
            (item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <span>{item}</span>
              </motion.div>
            ),
          )}
        </motion.div>
      </div>
    </section>
  )
}
