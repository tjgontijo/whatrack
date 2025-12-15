import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4" data-testid="not-found-page">
      <div className="text-center max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground">Página não encontrada</h2>
        </div>
        <p className="text-muted-foreground">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </Button>
      </div>
    </div>
  );
}
