'use client'

import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWhatsAppInstances } from '@/features/whatsapp/hooks/use-whatsapp-instances'
import { cn } from '@/lib/utils/utils'

interface InstanceSelectorProps {
  selectedInstanceId: string | null
  onInstanceChange: (instanceId: string) => void
  className?: string
}

/**
 * Instance Selector Component
 *
 * Dropdown to select which WhatsApp instance (phone number) to filter conversations by.
 * Shows all connected instances for the organization.
 *
 * Default: "Todas as instâncias" (show all)
 */
export function InstanceSelector({
  selectedInstanceId,
  onInstanceChange,
  className,
}: InstanceSelectorProps) {
  const { data, isLoading, error } = useWhatsAppInstances()

  const instances = data?.items || []

  // Auto-select single instance if it's the only one
  useEffect(() => {
    if (instances.length === 1 && selectedInstanceId === null && !isLoading) {
      onInstanceChange(instances[0].id)
    }
  }, [instances, selectedInstanceId, isLoading, onInstanceChange])

  if (isLoading) {
    return (
      <div className='flex h-12 w-full items-center rounded-md border border-border/40 bg-muted/15 px-3 text-muted-foreground text-sm'>
        Carregando...
      </div>
    )
  }

  if (error || !instances) {
    return <div className='p-2 text-muted-foreground text-xs'>Erro ao carregar instâncias</div>
  }

  // If no instances, show message
  if (instances.length === 0) {
    return <div className='p-2 text-muted-foreground text-xs'>Nenhuma instância conectada</div>
  }

  const effectiveId =
    instances.length === 1 && selectedInstanceId === null && !isLoading
      ? instances[0].id
      : selectedInstanceId || 'all'

  // Always show "Todas as instâncias" option, even with single instance
  return (
    <Select value={effectiveId} onValueChange={onInstanceChange}>
      <SelectTrigger
        className={cn(
          'h-12 rounded-md border-border/40 bg-muted/15 text-sm shadow-none hover:bg-muted/25',
          className
        )}
      >
        <SelectValue placeholder='Selecione uma instância' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>
          <span className='text-sm'>Todas as instâncias</span>
        </SelectItem>
        {instances.map((instance) => (
          <SelectItem key={instance.id} value={instance.id}>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>{instance.displayPhone}</span>
              {instance.verifiedName && (
                <span className='text-muted-foreground text-xs'>({instance.verifiedName})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
