import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

type SettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
  onSave?: () => void
  isSaving?: boolean
  saveLabel?: string
  danger?: boolean
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  onSave,
  isSaving = false,
  saveLabel = 'Salvar',
  danger = false,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card',
        danger ? 'border-destructive/30' : 'border-border',
        className
      )}
    >
      <div className='px-6 py-5'>
        <h2
          className={cn('font-semibold text-base', danger ? 'text-destructive' : 'text-foreground')}
        >
          {title}
        </h2>
        {description ? <p className='mt-1 text-muted-foreground text-sm'>{description}</p> : null}
      </div>

      <div className='space-y-4 border-border border-t px-6 py-5'>{children}</div>

      {onSave ? (
        <div className='flex justify-end rounded-b-xl border-border border-t bg-muted/20 px-6 py-4'>
          <Button onClick={onSave} disabled={isSaving} variant={danger ? 'destructive' : 'default'}>
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
