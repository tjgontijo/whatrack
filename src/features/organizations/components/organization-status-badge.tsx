'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { OrganizationIdentityDrawer } from '@/features/organizations/components/organization-identity-drawer'

type OrganizationStatusBadgeProps = {
  hasOrganization: boolean
  identityComplete: boolean
}

export function OrganizationStatusBadge({
  hasOrganization,
  identityComplete,
}: OrganizationStatusBadgeProps) {
  if (!hasOrganization || identityComplete) {
    return null
  }

  const title = hasOrganization ? 'Dados da organização incompletos' : 'Crie sua organização'

  const description = hasOrganization
    ? 'WhatsApp e Meta Ads ficam bloqueados até concluir o cadastro com documento válido.'
    : 'Informe seu CPF/CNPJ para habilitar integrações e começar a usar as automações.'

  return (
    <TooltipProvider delayDuration={400}>
      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='relative h-9 w-9 text-amber-600 transition-all hover:bg-amber-100/50 hover:text-amber-700 active:scale-95'
              >
                <AlertTriangle className='h-5 w-5' />
                <span className='absolute top-1 right-1 flex h-2.5 w-2.5'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
                  <span className='relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500 shadow-sm'></span>
                </span>
                <span className='sr-only'>{title}</span>
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side='bottom' align='center' className='font-medium text-[10px]'>
            Status da Organização
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          align='end'
          className='w-80 border-amber-200 bg-white p-0 shadow-2xl ring-1 ring-amber-900/10'
        >
          <div className='p-5'>
            <div className='flex items-start gap-4'>
              <div className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-inner'>
                <AlertTriangle className='h-4 w-4' />
              </div>
              <div className='space-y-1.5 font-sans'>
                <p className='font-bold text-amber-900 text-sm leading-none'>{title}</p>
                <p className='text-amber-800/80 text-xs leading-relaxed'>{description}</p>
              </div>
            </div>
          </div>

          <div className='border-amber-100 border-t bg-amber-50/50 p-3'>
            <OrganizationIdentityDrawer
              hasOrganization={hasOrganization}
              trigger={
                <Button className='h-10 w-full rounded-xl bg-amber-600 font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:bg-amber-800'>
                  {hasOrganization ? 'Concluir cadastro' : 'Criar minha organização'}
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
