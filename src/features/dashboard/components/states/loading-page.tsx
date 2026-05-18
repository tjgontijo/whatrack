import { LoadingSpinner } from './loading-spinner'

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message = 'Carregando...' }: LoadingPageProps) {
  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-3'>
      <LoadingSpinner size='lg' />
      <p className='font-medium text-caption text-gray-500 dark:text-gray-400'>{message}</p>
    </div>
  )
}
