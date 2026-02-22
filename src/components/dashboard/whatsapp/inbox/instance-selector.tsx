'use client'

import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Instance {
  id: string
  displayPhone: string
  verifiedName: string
  status: string
  wabaId: string | null
  lastWebhookAt: string | null
}

interface InstanceSelectorProps {
  selectedInstanceId: string | null
  onInstanceChange: (instanceId: string) => void
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
}: InstanceSelectorProps) {
  // Fetch list of connected instances
  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const response = await fetch('/api/v1/whatsapp/instances')
      if (!response.ok) throw new Error('Failed to fetch instances')
      return response.json() as Promise<{ items: Instance[] }>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  const instances = data?.items || []

  // Auto-select single instance if it's the only one
  useEffect(() => {
    if (
      instances.length === 1 &&
      selectedInstanceId === null &&
      !isLoading
    ) {
      onInstanceChange(instances[0].id)
    }
  }, [instances, selectedInstanceId, isLoading, onInstanceChange])

  if (isLoading) {
    return <div className="h-10 w-full flex items-center px-3 border rounded-md text-sm text-muted-foreground bg-muted/20">Carregando...</div>
  }

  if (error || !instances) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        Erro ao carregar instâncias
      </div>
    )
  }

  // If no instances, show message
  if (instances.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        Nenhuma instância conectada
      </div>
    )
  }

  // Always show "Todas as instâncias" option, even with single instance
  return (
    <Select value={selectedInstanceId || 'all'} onValueChange={onInstanceChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione uma instância" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="text-sm">Todas as instâncias</span>
        </SelectItem>
        {instances.map((instance) => (
          <SelectItem key={instance.id} value={instance.id}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{instance.displayPhone}</span>
              {instance.verifiedName && (
                <span className="text-xs text-muted-foreground">
                  ({instance.verifiedName})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
