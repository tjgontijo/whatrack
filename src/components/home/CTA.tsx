import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground py-24 sm:py-32">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 -top-20 -translate-x-1/2 h-96 w-[1000px] rounded-[100%] bg-white/10 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-0 z-10">
        <h2 className="text-4xl font-extrabold sm:text-5xl tracking-tight text-white mb-6">
          Pronto para dobrar o ROI das suas campanhas?
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-xl text-primary-foreground/90 font-medium leading-relaxed">
          Crie sua conta agora e libere <span className="text-white font-bold border-b border-white">7 dias grátis</span>. Nenhuma cobrança será feita. Se as suas vendas não ficarem mais organizadas na primeira semana, você cancela com um clique.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="h-14 px-8 text-lg font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 transition-transform hover:-translate-y-1"
            asChild
          >
            <Link href="/auth/sign-up">
              Começar meus 7 Dias Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            className="h-14 px-8 text-lg font-bold border-2 border-white/20 bg-transparent text-white hover:bg-white/10 transition-colors"
            asChild
          >
            <Link href="#pricing">Ver planos</Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-primary-foreground/80 font-medium">
          Rápido. Fácil de usar. Cancelamento sem burocracia.
        </p>
      </div>
    </section>
  );
}
