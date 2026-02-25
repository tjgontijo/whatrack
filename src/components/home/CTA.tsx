import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTA() {
  return (
    <section className="bg-primary text-primary-foreground relative overflow-hidden py-24 sm:py-32">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-96 w-[1000px] -translate-x-1/2 rounded-[100%] bg-white/10 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-0">
        <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Pronto para dobrar o ROI das suas campanhas?
        </h2>

        <p className="text-primary-foreground/90 mx-auto mt-6 max-w-2xl text-xl font-medium leading-relaxed">
          Crie sua conta agora e libere{' '}
          <span className="border-b border-white font-bold text-white">7 dias grátis</span>. Nenhuma
          cobrança será feita. Se as suas vendas não ficarem mais organizadas na primeira semana,
          você cancela com um clique.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="text-primary h-14 bg-white px-8 text-lg font-bold shadow-xl shadow-black/10 transition-transform hover:-translate-y-1 hover:bg-white/90"
            asChild
          >
            <Link href="/sign-up">
              Começar meus 7 Dias Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            className="h-14 border-2 border-white/20 bg-transparent px-8 text-lg font-bold text-white transition-colors hover:bg-white/10"
            asChild
          >
            <Link href="#pricing">Ver planos</Link>
          </Button>
        </div>

        <p className="text-primary-foreground/80 mt-8 text-sm font-medium">
          Rápido. Fácil de usar. Cancelamento sem burocracia.
        </p>
      </div>
    </section>
  )
}
