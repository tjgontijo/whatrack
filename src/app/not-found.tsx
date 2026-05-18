import { Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div
      className='flex min-h-screen flex-col items-center justify-center bg-background p-4'
      data-testid='not-found-page'
    >
      <div className='max-w-md space-y-6 text-center'>
        <div className='space-y-2'>
          <h1 className='font-bold text-7xl text-foreground'>404</h1>
          <h2 className='font-semibold text-2xl text-muted-foreground'>Página não encontrada</h2>
        </div>
        <p className='text-muted-foreground'>
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild className='gap-2'>
          <Link href='/'>
            <Home className='h-4 w-4' />
            Voltar para a página inicial
          </Link>
        </Button>
      </div>
    </div>
  )
}
