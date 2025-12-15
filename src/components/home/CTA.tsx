import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-background to-card py-24 sm:py-32">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/2 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 top-1/2 h-80 w-80 rounded-full bg-chart-3/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-0">
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
          Pronto para ver quanto seu WhatsApp realmente vende?
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Agende uma demonstração rápida e veja na prática como o WhatRack conecta leads, conversas,
          agendamentos e vendas em um painel que você entende.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
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

        <p className="mt-6 text-sm text-muted-foreground">
          Demonstração guiada, sem compromisso.
        </p>
      </div>
    </section>
  );
}
