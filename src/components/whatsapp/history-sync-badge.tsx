'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'

interface HistorySyncBadgeProps {
  status?: string | null
  progress?: number
}

export function HistorySyncBadge({ status, progress = 0 }: HistorySyncBadgeProps) {
  if (!status) return null

  const statusConfig: Record<string, {
    label: string;
    icon: React.ComponentType<any>;
    className: string;
    animate?: boolean;
  }> = {
    pending_consent: {
      label: 'Aguardando Aprovação',
      icon: Clock,
      className: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    pending_history: {
      label: 'Aguardando Histórico',
      icon: Clock,
      className: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    syncing: {
      label: `Sincronizando (${progress}%)`,
      icon: Loader2,
      className: 'text-blue-600 bg-blue-50 border-blue-200',
      animate: true,
    },
    completed: {
      label: 'Histórico Sincronizado',
      icon: CheckCircle2,
      className: 'text-green-600 bg-green-50 border-green-200',
    },
    declined: {
      label: 'Histórico Recusado',
      icon: AlertCircle,
      className: 'text-red-600 bg-red-50 border-red-200',
    },
    failed: {
      label: 'Sincronização Falhou',
      icon: AlertCircle,
      className: 'text-red-600 bg-red-50 border-red-200',
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) return null

  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={`font-semibold border gap-1.5 flex items-center ${config.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  )
}
