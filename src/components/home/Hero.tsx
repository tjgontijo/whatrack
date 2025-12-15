import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const highlights = [
  "Rastreie leads, agendamentos e vendas em um painel",
  "Veja exatamente quanto cada campanha vende",
  "Identifique seus melhores atendentes e canais",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-card text-foreground">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 top-40 h-80 w-80 rounded-full bg-chart-3/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-24 pb-40 sm:px-8 lg:flex-row lg:items-center lg:px-0">
        <div className="space-y-8 lg:flex-1">
          <Badge variant="secondary" className="w-fit bg-muted text-foreground">
            🚀 Radar de vendas para WhatsApp e outros canais
          </Badge>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
              Veja exatamente quanto seu WhatsApp está vendendo
            </h1>

            <p className="text-lg text-muted-foreground sm:text-xl">
              Seus clientes recebem leads o dia todo no WhatsApp, mas você não sabe de onde vieram, quanto
              geraram de receita ou quem comprou. O WhatRack conecta tudo isso em um painel que você entende.
            </p>
          </div>

          <div className="space-y-4">
            {highlights.map((highlight) => (
              <div key={highlight} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-success" />
                <span className="text-base text-muted-foreground">{highlight}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 font-semibold"
              asChild
            >
              <Link href="https://wa.me/5561982482100" target="_blank" rel="noreferrer">
                Agendar demonstração
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-2 border-primary bg-transparent font-semibold hover:bg-primary/20"
              asChild
            >
              <Link href="#pricing">Ver planos</Link>
            </Button>
          </div>
        </div>

        {/* Right column with image and logo */}
        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-md space-y-6">
            {/* Dashboard mockup placeholder */}
            <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center">
                <Image
                  src="/images/logo_transparent.png"
                  alt="WhatRack"
                  width={200}
                  height={100}
                  className="h-auto w-auto object-contain"
                  priority
                />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-8 border-t border-border bg-gradient-to-t from-background to-transparent px-6 py-8 sm:px-8 sm:flex-row sm:items-center sm:justify-between lg:px-0">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">CONFIADO POR</p>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-chart-3 to-chart-3/60" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-chart-5 to-chart-5/60" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            <div>
              <p className="text-2xl font-bold text-foreground">500+</p>
              <p className="text-sm text-muted-foreground">Empresas rastreando</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">R$ 5M+</p>
              <p className="text-sm text-muted-foreground">Em vendas rastreadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">98%</p>
              <p className="text-sm text-muted-foreground">Taxa de uptime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
