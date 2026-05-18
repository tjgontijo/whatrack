'use client'

import { Loader2 } from 'lucide-react'
import type React from 'react'

interface SuspenseLoaderProps {
  message?: string
}

export const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({ message = 'Carregando...' }) => {
  return (
    <div className='flex min-h-[200px] flex-col items-center justify-center gap-4'>
      <Loader2 className='h-10 w-10 animate-spin text-primary' />
      <p className='text-muted-foreground text-sm'>{message}</p>
    </div>
  )
}

export default SuspenseLoader
