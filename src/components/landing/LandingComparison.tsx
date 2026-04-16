'use client'

import { X, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

const rows = [
  {
    without: 'Números inflados do Gerenciador de Anúncios',
    with: 'Conversões reais baseadas em conversas do WhatsApp',
  },
  {
    without: 'CAC e ROAS são estimativas sem base real',
    with: 'CAC e ROAS calculados por campanha e anúncio',
  },
  {
    without: 'Leads perdidos entre o anúncio e o WhatsApp',
    with: 'Cada lead rastreado da origem até a venda',
  },
  {
    without: 'Algoritmo otimizando para cliques baratos',
    with: 'Algoritmo otimizando para compradores reais',
  },
  {
    without: 'Planilha manual para acompanhar vendas',
    with: 'CRM integrado com pipeline de atendimento',
  },
  {
    without: 'Disparos manuais com risco de bloqueio',
    with: 'Disparos com templates aprovados via API Oficial',
  },
]

export function LandingComparison() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative overflow-hidden bg-zinc-950 py-32">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute bottom-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute -left-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -right-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-red-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Comparativo
            </span>
          </div>

          <h2 className="font-geist text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            A diferença entre{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              otimizar no escuro e escalar com dados.
            </span>
          </h2>
        </motion.div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-zinc-800">
          {/* Column headers */}
          <div className="grid grid-cols-2">
            <div className="flex items-center gap-3 border-b border-r border-zinc-800 bg-red-950/30 px-6 py-4 sm:px-8 sm:py-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <X className="h-4 w-4 text-red-400" />
              </div>
              <span className="font-geist text-sm font-bold uppercase tracking-wider text-red-400 sm:text-base">
                Sem WhaTrack
              </span>
            </div>
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-emerald-950/30 px-6 py-4 sm:px-8 sm:py-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-geist text-sm font-bold uppercase tracking-wider text-emerald-400 sm:text-base">
                Com WhaTrack
              </span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{
                delay: 0.2 + i * 0.08,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="grid grid-cols-2"
            >
              {/* Without */}
              <div
                className={`flex items-start gap-3 border-r border-zinc-800 px-6 py-5 sm:px-8 ${
                  i < rows.length - 1 ? 'border-b' : ''
                } ${i % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10'}`}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <X className="h-3.5 w-3.5 text-red-500" />
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 sm:text-base">{row.without}</p>
              </div>

              {/* With */}
              <div
                className={`flex items-start gap-3 px-6 py-5 sm:px-8 ${
                  i < rows.length - 1 ? 'border-b border-zinc-800' : ''
                } ${i % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10'}`}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-200 sm:text-base">
                  {row.with}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
