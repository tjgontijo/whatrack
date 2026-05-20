'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type OrganizationStatusBadgeProps = {
  launchpadHref: string
  identityComplete: boolean
}

export function OrganizationStatusBadge({
  launchpadHref,
  identityComplete,
}: OrganizationStatusBadgeProps) {
  if (identityComplete) {
    return null
  }

  const title = 'Dados da organização incompletos'

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant='ghost'
            size='icon'
            className='relative h-9 w-9 text-amber-600 transition-all hover:bg-amber-100/50 hover:text-amber-700 active:scale-95'
          >
            <Link href={launchpadHref} aria-label={title}>
              <AlertTriangle className='h-5 w-5' />
              <span className='absolute top-1 right-1 flex h-2.5 w-2.5'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
                <span className='relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500 shadow-sm'></span>
              </span>
              <span className='sr-only'>{title}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' align='center' className='font-medium text-[10px]'>
          Ir para Configurar conta
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
