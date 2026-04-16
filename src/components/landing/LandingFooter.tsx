import Link from 'next/link'
import Image from 'next/image'

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-zinc-50/50 dark:to-zinc-900/50" />

      <div className="relative mx-auto max-w-[1400px] px-6 py-16 sm:px-8 lg:px-12">
        {/* Main footer content */}
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand section - spans 2 columns */}
          <div className="space-y-6 lg:col-span-2">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 transition hover:opacity-80"
            >
              <div className="relative h-8 w-32">
                <Image
                  src="/images/logo/logo_transparent_light_horizontal.png"
                  alt="WhaTrack"
                  fill
                  className="object-contain transition-transform group-hover:scale-105 dark:hidden"
                />
                <Image
                  src="/images/logo/logo_transparent_dark_horizontal.png"
                  alt="WhaTrack"
                  fill
                  className="hidden object-contain transition-transform group-hover:scale-105 dark:block"
                />
              </div>
            </Link>

            <p className="max-w-sm text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Conecte seus anúncios Meta às vendas no WhatsApp. CAC e ROAS reais, por campanha e
              anúncio.
            </p>
          </div>

          {/* Empresa */}
          <div className="space-y-4">
            <h4 className="font-geist text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Empresa
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/sign-in"
                  className="text-sm text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                >
                  Entrar
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/5561982482100"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                >
                  Falar com a gente
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-geist text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                >
                  Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                >
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:flex-row">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            &copy; 2025 WhaTrack. Todos os direitos reservados.
          </p>

          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Elev8 Negocios Digitais LTDA | CNPJ: 63.823.086/0001-72
          </p>
        </div>
      </div>
    </footer>
  )
}
