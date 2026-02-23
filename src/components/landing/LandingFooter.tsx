import Link from 'next/link'
import Image from 'next/image'

export function LandingFooter() {
  return (
    <footer className="border-border bg-background text-muted-foreground border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-0">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex w-fit items-center gap-2 transition hover:opacity-80">
              <Image
                src="/images/logo_transparent.png"
                alt="WhaTrack"
                width={100}
                height={40}
                className="h-6 w-auto object-contain"
              />
            </Link>
            <p className="text-sm">Rastreamento inteligente de vendas para WhatsApp.</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-foreground font-semibold">Soluções</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/solucoes/agencias" className="hover:text-foreground transition">
                  Para Agências
                </Link>
              </li>
              <li>
                <Link href="/solucoes/lancamentos" className="hover:text-foreground transition">
                  Para Lançadores
                </Link>
              </li>
              <li>
                <Link href="/solucoes/empresas" className="hover:text-foreground transition">
                  Para Empresas
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-foreground font-semibold">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/sign-in" className="hover:text-foreground transition">
                  Entrar
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/5561982482100"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition"
                >
                  Falar com a gente
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-foreground font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border mt-12 border-t pt-8 text-center text-sm">
          <p>&copy; 2025 WhaTrack. Todos os direitos reservados.</p>
          <span className="text-xs">Elev8 Negocios Digitais LTDA | CNPJ: 63.823.086/0001-72</span>
        </div>
      </div>
    </footer>
  )
}
