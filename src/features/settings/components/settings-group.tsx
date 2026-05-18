import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

type SettingsGroupProps = {
  label: string
  description?: string
  children: ReactNode
  onSave?: () => void
  isSaving?: boolean
  saveLabel?: string
  footer?: ReactNode
  className?: string
}

export function SettingsGroup({
  label,
  description,
  children,
  onSave,
  isSaving = false,
  saveLabel = 'Salvar',
  footer,
  className,
}: SettingsGroupProps) {
  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      <div className='px-6 py-5'>
        <h2 className='font-semibold text-base'>{label}</h2>
        {description ? <p className='mt-1 text-muted-foreground text-sm'>{description}</p> : null}
      </div>

      <div className='divide-y divide-border border-border border-t px-6'>{children}</div>

      {footer ? (
        <div className='rounded-b-xl border-border border-t bg-muted/20 px-6 py-4'>{footer}</div>
      ) : onSave ? (
        <div className='flex justify-end rounded-b-xl border-border border-t bg-muted/20 px-6 py-4'>
          <Button type='button' onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
