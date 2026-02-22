import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LandingVariant } from "./types";

interface LandingHeaderProps {
  variant?: LandingVariant;
}

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
];

const variantLinks: Record<LandingVariant, { label: string; href: string }[]> = {
  generic: [
    { label: "Para Agências", href: "/solucoes/agencias" },
    { label: "Para Lançadores", href: "/solucoes/lancamentos" },
    { label: "Para Empresas", href: "/solucoes/empresas" },
  ],
  agencias: [],
  lancadores: [],
  empresas: [],
};

export function LandingHeader({ variant = "generic" }: LandingHeaderProps) {
  const extraLinks = variantLinks[variant];

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-0">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/images/logo_transparent.png"
            alt="WhaTrack"
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
          {extraLinks.length > 0 && (
            <div className="flex items-center gap-6 border-l border-border pl-6">
              {extraLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-primary tracking-wide"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
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
            <Link href="/auth/sign-up">Testar Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
