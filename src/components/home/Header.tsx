import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Por que WhatRack", href: "#why" },
  { label: "Como funciona", href: "#how" },
  { label: "Planos", href: "#pricing" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity">
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
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-primary tracking-wide"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/sign-in"
            className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Button
            className="h-10 px-5 font-bold shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
            asChild
          >
            <Link href="/auth/sign-up">Teste Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
