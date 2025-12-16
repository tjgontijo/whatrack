'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Plus, Wifi, WifiOff, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import { Skeleton } from '@/components/ui/skeleton'
import { InstanceDetailsDialog } from '@/components/dashboard/whatsapp/instance-details-dialog'
import { CreateInstanceDialog } from '@/components/dashboard/whatsapp/create-instance-dialog'
import { TestMessageDialog } from './test-message-dialog'
import {
  whatsappInstancesResponseSchema,
  type WhatsappInstance,
} from '@/schemas/whatsapp'
import { useOrganizationLimits } from '@/hooks/use-organization-limits'
import { formatWhatsAppWithFlag } from '@/lib/mask/phone-mask'
import Link from 'next/link'

export function QRCodeTab() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<WhatsappInstance | null>(null)
  const [testInstance, setTestInstance] = useState<WhatsappInstance | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const { limits, isLoading: limitsLoading } = useOrganizationLimits()

  const { data, isFetching, refetch, isLoading } = useQuery<WhatsappInstance[]>({
    queryKey: ['whatsapp-instances', organizationId, refreshIndex],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) throw new Error('Organização não encontrada')

      const response = await fetch('/api/v1/whatsapp/w/instances', {
        headers: {
          [ORGANIZATION_HEADER]: organizationId,
        },
      })

      if (response.status === 403) {
        return []
      }

      if (!response.ok) {
        throw new Error('Não foi possível carregar as instâncias')
      }

      const json = await response.json()
      const parsed = whatsappInstancesResponseSchema.parse(json)
      return parsed.items
    },
  })

  const handleRefresh = async () => {
    try {
      setRefreshIndex((prev) => prev + 1)
      await refetch({ cancelRefetch: false })
      toast.success('Status atualizado')
    } catch {
      toast.error('Falha ao atualizar status')
    }
  }

  const orderedItems = useMemo(() => data ?? [], [data])

  const usedInstances = orderedItems.length
  const maxInstances = limits?.maxWhatsappInstances ?? 0

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
        <h3 className="text-lg font-semibold">Nenhuma organização ativa</h3>
        <p className="text-sm text-muted-foreground">
          Selecione ou crie uma organização para gerenciar instâncias do WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={isFetching}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : orderedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Nenhum número conectado ainda.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {orderedItems.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onClick={() => setSelectedInstance(instance)}
              onTestClick={() => setTestInstance(instance)}
            />
          ))}
        </ul>
      )}

      {/* Usage indicator */}
      {!limitsLoading && maxInstances > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Usando <span className="font-medium text-foreground">{usedInstances}</span> de{' '}
            <span className="font-medium text-foreground">{maxInstances}</span> números do seu plano
          </span>
          <Link
            href="/pricing"
            className="text-primary hover:underline text-sm font-medium"
          >
            Ver planos
          </Link>
        </div>
      )}

      {selectedInstance && (
        <InstanceDetailsDialog
          instance={selectedInstance}
          open={Boolean(selectedInstance)}
          onOpenChange={(open) => !open && setSelectedInstance(null)}
          onUpdate={() => {
            setSelectedInstance(null)
            refetch()
          }}
        />
      )}

      <CreateInstanceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() => refetch()}
      />

      {testInstance && (
        <TestMessageDialog
          instance={testInstance}
          open={Boolean(testInstance)}
          onOpenChange={(open) => !open && setTestInstance(null)}
        />
      )}
    </div>
  )
}

function InstanceCard({
  instance,
  onClick,
  onTestClick,
}: {
  instance: WhatsappInstance
  onClick: () => void
  onTestClick: () => void
}) {
  const isConnected = instance.status === 'connected' || instance.status === 'open'
  const isDisconnected = !isConnected
  const instanceLabel = instance.label || instance.instanceId || instance.id

  return (
    <li
      onClick={onClick}
      className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border hover:shadow-md cursor-pointer"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground truncate pr-2" title={instanceLabel}>
              {instanceLabel}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{formatWhatsAppWithFlag(instance.phone ?? '')}</p>
          </div>

          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/30">
              <Wifi className="h-3 w-3" />
              Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/30">
              <WifiOff className="h-3 w-3" />
              Desconectado
            </span>
          )}
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Última Atualização:</span>
            <span>{formatDate(instance.updatedAt)}</span>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="mt-5 pt-5 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={(e) => {
              e.stopPropagation()
              onTestClick()
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Enviar Teste
          </Button>
        </div>
      )}

      {isDisconnected && (
        <div className="mt-5 pt-5 border-t border-border/50">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              Requer Conexão
            </p>
            <p className="text-xs text-muted-foreground">Clique para conectar</p>
          </div>
        </div>
      )}
    </li>
  )
}

function formatDate(value?: string | null) {
  try {
    if (!value) return '—'
    const date = new Date(value)
    if (isNaN(date.getTime())) return '—'

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 24 * 60 * 60 * 1000) {
      return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
        -Math.round(diff / (1000 * 60 * 60)),
        'hour'
      )
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '—'
  }
}
