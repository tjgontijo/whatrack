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
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 sm:px-8 lg:px-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition">
          <Image
            src="/images/logo_transparent.png"
            alt="WhatRack"
            width={120}
            height={40}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-foreground hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Login Button */}
        <Button
          variant="outline"
          className="h-10 border-2 border-primary bg-transparent font-semibold hover:bg-primary/20"
          asChild
        >
          <Link href="/sign-in">Entrar</Link>
        </Button>
      </div>
    </header>
  );
}
