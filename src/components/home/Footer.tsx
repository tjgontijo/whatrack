import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background text-muted-foreground">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-0">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition w-fit">
              <Image
                src="/images/logo_transparent.png"
                alt="WhatRack"
                width={100}
                height={40}
                className="h-6 w-auto object-contain"
              />
            </Link>
            <p className="text-sm">Radar de vendas para WhatsApp e outros canais.</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#why" className="transition hover:text-foreground">
                  Por que WhatRack
                </Link>
              </li>
              <li>
                <Link href="#how" className="transition hover:text-foreground">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="transition hover:text-foreground">
                  Planos
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/sign-in" className="transition hover:text-foreground">
                  Entrar
                </Link>
              </li>
              <li>
                <a href="https://wa.me/5561982482100" target="_blank" rel="noreferrer" className="transition hover:text-foreground">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="transition hover:text-foreground">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition hover:text-foreground">
                  Termos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm">
          <p>&copy; 2024 WhaTrack. Todos os direitos reservados.</p>
          <span className="text-xs">Elev8 Negocios Digitais LTDA | CNPJ: 63.823.086/0001-72</span>
        </div>
      </div>
    </footer>
  );
}
