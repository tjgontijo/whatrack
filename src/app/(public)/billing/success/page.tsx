'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBillingPlan } from '@/lib/billing/plans'
import { resolveInternalPath } from '@/lib/utils/internal-path'

const SUCCESS_REDIRECT_DELAY_MS = 5000

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planName = getBillingPlan(searchParams.get('plan') || '')?.name || 'WhaTrack'
  const nextPath = resolveInternalPath(searchParams.get('next'), '/dashboard/billing')

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(nextPath)
    }, SUCCESS_REDIRECT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [nextPath, router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Animated background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            delay: 0.2,
          }}
          className="mb-8"
        >
          {/* Checkmark circle */}
          <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-2xl shadow-emerald-500/50">
            {/* Animated ring */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
            />

            {/* Checkmark */}
            <div className="flex h-full w-full items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="mb-4 font-geist text-4xl font-bold sm:text-5xl">
            Bem-vindo ao <span className="text-emerald-400">{planName}!</span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-400">
            Sua assinatura está ativa e pronta para usar. Você agora tem acesso total aos
            recursos do plano {planName}.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-12 grid w-full max-w-2xl gap-4 sm:grid-cols-3"
        >
          {[
            { label: 'Começar agora', desc: 'Acesso imediato' },
            { label: 'Suporte incluso', desc: 'Estamos aqui para ajudar' },
            { label: 'Cancele quando quiser', desc: 'Sem compromisso' },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + idx * 0.1, duration: 0.6 }}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm"
            >
              <div className="text-sm font-semibold text-emerald-400">{item.label}</div>
              <div className="text-xs text-zinc-400">{item.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button
            onClick={() => router.push(nextPath)}
            className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            Ir para o Dashboard
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="h-12 rounded-xl border-zinc-700 px-8 font-semibold text-white hover:bg-zinc-900"
          >
            Explorar WhaTrack
          </Button>
        </motion.div>

        {/* Auto-redirect message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12 text-sm text-zinc-500"
        >
          Redirecionando para o dashboard em <span className="font-semibold">5 segundos</span>...
        </motion.p>
      </div>
    </div>
  )
}
