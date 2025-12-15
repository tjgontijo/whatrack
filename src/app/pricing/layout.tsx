import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Planos e Preços | Whatrack",
  description: "Escolha o plano ideal para rastrear suas vendas pelo WhatsApp. Comece gratuitamente com 14 dias de trial.",
  openGraph: {
    title: "Planos e Preços | Whatrack",
    description: "Escolha o plano ideal para rastrear suas vendas pelo WhatsApp. Comece gratuitamente com 14 dias de trial.",
    type: "website",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
