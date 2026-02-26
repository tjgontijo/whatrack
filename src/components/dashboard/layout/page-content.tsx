import { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('flex-1', className)}>
      {children}
    </div>
  )
}
