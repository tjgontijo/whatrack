import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      {/* Left side: Premium Branding & Graphic */}
      <div className="hidden lg:flex flex-col w-1/2 bg-muted/10 border-r border-border/40 relative overflow-hidden">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 lg:p-20">
          <div>
            <div className="mb-12">
              <img src="/images/logo_transparent.png" alt="Whatrack" className="h-9 w-auto opacity-90 transition-opacity hover:opacity-100" />
            </div>

            <Badge className="mb-6 bg-primary/10 text-primary border-transparent pointer-events-none">
              Para Lançadores & Agências
            </Badge>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Venda mais no orgânico e escale no pago.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground w-11/12 leading-relaxed font-medium">
              O CRM definitivo que une seus canais de <span className="text-foreground">WhatsApp</span> e integrações com o <span className="text-foreground">Meta Ads</span>. Descubra de onde vem cada real que entra.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center -space-x-4">
              {[
                { col: 'bg-emerald-100 border-emerald-200' },
                { col: 'bg-blue-100 border-blue-200' },
                { col: 'bg-purple-100 border-purple-200' },
                { col: 'bg-amber-100 border-amber-200 z-10' }
              ].map((style, i) => (
                <div key={i} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 shadow-sm flex items-center justify-center ${style.col}`} />
              ))}
              <div className="pl-8 flex flex-col">
                <span className="text-sm font-bold text-foreground">+2.000 operações</span>
                <span className="text-xs text-muted-foreground">já escalaram conosco.</span>
              </div>
            </div>
          </div>

          {/* Accent decoration */}
          <div className="absolute bottom-0 right-0 p-12 opacity-5 pointer-events-none">
            <svg width="400" height="400" viewBox="0 0 100 100" className="w-96 h-96 fill-current text-primary blur-3xl rounded-full">
              <circle cx="50" cy="50" r="50" />
            </svg>
          </div>

        </div>
      </div>

      {/* Right side: Auth Form Content */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 relative bg-white">
        <div className="lg:hidden absolute top-8 left-8">
          <img src="/images/logo_transparent.png" alt="Whatrack" className="h-8 w-auto mix-blend-multiply dark:mix-blend-screen" />
        </div>
        <div className="w-full max-w-[420px] mx-auto">
          {children}
        </div>
      </div>

      <Toaster richColors position="bottom-center" />
    </div>
  )
}

