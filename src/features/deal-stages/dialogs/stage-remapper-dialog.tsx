'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/http/api-client'
import type { DealStage } from '../types'

interface StageRemapperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage: DealStage | null
  organizationId?: string
  projectId?: string
  onSuccess: () => void
}

export function StageRemapperDialog({
  open,
  onOpenChange,
  stage,
  organizationId,
  projectId,
  onSuccess,
}: StageRemapperDialogProps) {
  const queryClient = useQueryClient()
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('')

  const { data: stagesData } = useQuery<{ items: DealStage[] }>({
    queryKey: ['deal-stages', organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/deal-stages', {
        orgId: organizationId,
        projectId,
      })
      return data as { items: DealStage[] }
    },
    enabled: open && !!organizationId,
  })

  const stages = stagesData?.items ?? []

  const availableDestinations = stages.filter((s) => s.id !== stage?.id)

  const migrateMutation = useMutation({
    mutationFn: async (destinationId: string) => {
      const data = await apiFetch(`/api/v1/deal-stages/${stage?.id}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationStageId: destinationId }),
        orgId: organizationId,
        projectId,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Negociações movidas com sucesso')
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      onOpenChange(false)
      setSelectedDestinationId('')
      onSuccess()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleMigrate = () => {
    if (!selectedDestinationId) {
      toast.error('Selecione um stage de destino')
      return
    }
    migrateMutation.mutate(selectedDestinationId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Mover Negociações</DialogTitle>
          <DialogDescription>
            {stage?.name} tem {stage?.dealsCount || 0} negociação
            {stage?.dealsCount !== 1 ? 's' : ''}. Para qual stage deseja movê-las?
          </DialogDescription>
        </DialogHeader>

        <Alert className='border-yellow-200 bg-yellow-50'>
          <AlertCircle className='h-4 w-4 text-yellow-600' />
          <AlertDescription className='text-sm text-yellow-800'>
            Essa ação não pode ser desfeita. Todas as negociações serão movidas para o stage
            selecionado.
          </AlertDescription>
        </Alert>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>Stage de Destino</label>
          <Select value={selectedDestinationId} onValueChange={setSelectedDestinationId}>
            <SelectTrigger>
              <SelectValue placeholder='Escolha um stage' />
            </SelectTrigger>
            <SelectContent>
              {availableDestinations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.dealsCount || 0} deals)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={migrateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={!selectedDestinationId || migrateMutation.isPending}
          >
            {migrateMutation.isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Movendo...
              </>
            ) : (
              'Mover'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
