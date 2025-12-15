'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlansComparison } from '@/components/billing/plans-comparison'
import { CheckoutModal, type Plan, type PaymentInterval } from '@/components/billing/checkout-modal'
import { useSession } from '@/lib/auth/auth-client'
import { ArrowLeft } from 'lucide-react'

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedInterval, setSelectedInterval] = useState<PaymentInterval>('monthly')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const handleSelectPlan = (plan: Plan, interval: PaymentInterval) => {
    if (!session) {
      // Redirect to login with return URL
      router.push(`/sign-in?redirect=/pricing`)
      return
    }

    setSelectedPlan(plan)
    setSelectedInterval(interval)
    setIsCheckoutOpen(true)
  }

  const handleCheckoutSuccess = () => {
    router.push('/dashboard/settings/billing')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          {session ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Escolha o plano ideal para você
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece gratuitamente e escale conforme sua necessidade.
            Todos os planos incluem 14 dias de trial.
          </p>
        </div>

        {/* Plans */}
        <PlansComparison
          onSelectPlan={handleSelectPlan}
          showCurrentBadge={false}
        />

        {/* FAQ or Additional Info */}
        <div className="mx-auto max-w-2xl mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Dúvidas?</h2>
          <p className="text-muted-foreground">
            Entre em contato pelo email{' '}
            <a href="mailto:suporte@homenz.com.br" className="text-primary hover:underline">
              suporte@homenz.com.br
            </a>{' '}
            ou pelo WhatsApp.
          </p>
        </div>
      </main>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          plan={selectedPlan}
          interval={selectedInterval}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  )
}
