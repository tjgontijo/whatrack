import type { ReactNode } from 'react'
import Image from 'next/image'
import { Toaster } from '@/components/ui/sonner'
import { Badge } from '@/components/ui/badge'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen w-full font-sans">
      {/* Left side: Premium Branding & Graphic */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden lg:flex">
        {/* Background image */}
        <Image
          src="/images/bg_sign.webp"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 lg:p-20">
          <div>
            <div className="mb-12">
              <img
                src="/images/logo/logo_transparent_dark_horizontal.png"
                alt="Whatrack"
                className="h-9 w-auto opacity-90 transition-opacity hover:opacity-100"
              />
            </div>

            <Badge className="pointer-events-none mb-6 border-white/20 bg-white/10 text-white">
              Para agências e gestores de tráfego
            </Badge>

            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
              Prove para cada cliente o que realmente vende no WhatsApp.
            </h1>
            <p className="mt-6 w-11/12 text-lg font-medium leading-relaxed text-white/70">
              Conecte <span className="text-white">Meta Ads</span> e{' '}
              <span className="text-white">WhatsApp</span>, rastreie conversões reais e entregue
              relatórios de ROI que ajudam sua agência a reter clientes e justificar budget.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center -space-x-4">
              {[
                { col: 'bg-emerald-100 border-emerald-200' },
                { col: 'bg-blue-100 border-blue-200' },
                { col: 'bg-purple-100 border-purple-200' },
                { col: 'bg-amber-100 border-amber-200 z-10' },
              ].map((style, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm sm:h-12 sm:w-12 ${style.col}`}
                />
              ))}
              <div className="flex flex-col pl-8">
                <span className="text-sm font-bold text-white">Múltiplos clientes no mesmo painel</span>
                <span className="text-xs text-white/60">trial sem cartão e setup em poucos minutos.</span>
              </div>
            </div>
          </div>

          {/* Accent decoration */}
          <div className="pointer-events-none absolute bottom-0 right-0 p-12 opacity-5">
            <svg
              width="400"
              height="400"
              viewBox="0 0 100 100"
              className="text-primary h-96 w-96 rounded-full fill-current blur-3xl"
            >
              <circle cx="50" cy="50" r="50" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form Content */}
      <div className="bg-background relative flex flex-1 flex-col justify-center p-6 sm:p-12">
        <div className="absolute left-8 top-8 lg:hidden">
          <img
            src="/images/logo/logo_transparent_light_horizontal.png"
            alt="Whatrack"
            className="h-8 w-auto"
          />
        </div>
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>

      <Toaster richColors position="bottom-center" />
    </div>
  )
}
