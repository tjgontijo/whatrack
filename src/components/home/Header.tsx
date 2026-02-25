import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const navLinks = [
  { label: 'Por que WhatRack', href: '#why' },
  { label: 'Como funciona', href: '#how' },
  { label: 'Planos', href: '#pricing' },
]

export function Header() {
  return (
    <header className="border-border/40 bg-background/80 text-foreground supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-0">
        {/* Logo */}
        <Link
          href="/"
          className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/images/logo_transparent.png"
            alt="WhatRack"
            width={120}
            height={40}
            priority
            className="h-7 w-auto object-contain drop-shadow-sm"
          />
        </Link>

        {/* Navigation */}
        <nav className="text-muted-foreground hidden items-center gap-8 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-primary tracking-wide transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground hidden text-sm font-semibold transition-colors sm:block"
          >
            Entrar
          </Link>
          <Button
            className="shadow-primary/20 hover:shadow-primary/40 h-10 px-5 font-bold shadow-sm transition-all hover:-translate-y-0.5"
            asChild
          >
            <Link href="/sign-up">Teste Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
