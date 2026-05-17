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
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold">{label}</h2>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>

      <div className="border-border divide-border border-t divide-y px-6">{children}</div>

      {footer ? (
        <div className="border-border bg-muted/20 rounded-b-xl border-t px-6 py-4">{footer}</div>
      ) : onSave ? (
        <div className="border-border bg-muted/20 flex justify-end rounded-b-xl border-t px-6 py-4">
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
