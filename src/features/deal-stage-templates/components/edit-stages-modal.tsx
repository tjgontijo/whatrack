'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  GripVertical,
  Loader2,
  Megaphone,
  Plus,
  Settings2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { apiFetch } from '@/lib/http/api-client'
import { cn } from '@/lib/utils/utils'

interface TemplateItem {
  id: string
  name: string
  color: string
  order: number
  statusGroup: 'ACTIVE' | 'WON' | 'LOST'
  probability: number
  suggestedMetaEventName: string | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
  items: TemplateItem[]
}

interface EditStagesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  organizationId: string
  currentStages: any[] // Simplificando por enquanto
}

export function EditStagesModal({
  open,
  onOpenChange,
  projectId,
  organizationId,
  currentStages,
}: EditStagesModalProps) {
  const queryClient = useQueryClient()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  
  // Fetch Templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<Template[]>({
    queryKey: ['deal-stage-templates'],
    queryFn: async () => {
      const res = await fetch('/api/v1/deal-stage-templates')
      if (!res.ok) throw new Error('Falha ao buscar templates')
      return res.json()
    },
    enabled: open,
  })

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Apply Template Mutation
  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch('/api/v1/deal-stage-templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao aplicar template')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Template aplicado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['deal-stages', projectId] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleApply = () => {
    if (!selectedTemplateId) return
    
    if (currentStages.length > 0) {
      if (confirm('Atenção: Aplicar um novo template irá substituir suas fases atuais e mover as negociações existentes para a nova fase padrão. Deseja continuar?')) {
        applyMutation.mutate(selectedTemplateId)
      }
    } else {
      applyMutation.mutate(selectedTemplateId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] max-w-5xl flex-col p-0 overflow-hidden'>
        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar: Templates */}
          <div className='w-64 border-r border-border bg-muted/30 p-4 overflow-y-auto'>
            <div className='mb-4 px-2'>
              <h3 className='font-semibold text-sm'>Templates de Funil</h3>
              <p className='text-muted-foreground text-xs'>Escolha um modelo pronto</p>
            </div>
            
            <div className='space-y-1'>
              {isLoadingTemplates ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      selectedTemplateId === t.id
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {t.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main: Status Groups Editor */}
          <div className='flex-1 flex flex-col min-w-0 bg-background overflow-hidden'>
            <DialogHeader className='px-6 py-4 border-b border-border shrink-0'>
              <DialogTitle>
                {selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Selecione um Template'}
              </DialogTitle>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6 space-y-8'>
              {!selectedTemplate ? (
                <div className='h-full flex flex-col items-center justify-center text-center'>
                  <Settings2 className='h-12 w-12 text-muted-foreground/20' />
                  <h4 className='mt-4 font-medium text-muted-foreground'>Selecione um modelo à esquerda</h4>
                  <p className='text-sm text-muted-foreground/60 max-w-xs'>
                    Nossos templates vêm com fases e automações CAPI pré-configuradas para o seu nicho.
                  </p>
                </div>
              ) : (
                <>
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2 text-sm font-medium text-blue-500'>
                      <ChevronRight className='h-4 w-4' />
                      FASES ATIVAS (ACTIVE)
                    </div>
                    <div className='space-y-2 border-l-2 border-muted pl-4 ml-2'>
                      {selectedTemplate.items
                        .filter((i) => i.statusGroup === 'ACTIVE')
                        .map((item) => (
                          <StatusRow key={item.id} item={item} />
                        ))}
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div className='flex items-center gap-2 text-sm font-medium text-green-500'>
                      <ChevronRight className='h-4 w-4' />
                      FASES DE FECHAMENTO (WON)
                    </div>
                    <div className='space-y-2 border-l-2 border-muted pl-4 ml-2'>
                      {selectedTemplate.items
                        .filter((i) => i.statusGroup === 'WON')
                        .map((item) => (
                          <StatusRow key={item.id} item={item} />
                        ))}
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div className='flex items-center gap-2 text-sm font-medium text-red-500'>
                      <ChevronRight className='h-4 w-4' />
                      FASES DE PERDA (LOST)
                    </div>
                    <div className='space-y-2 border-l-2 border-muted pl-4 ml-2'>
                      {selectedTemplate.items
                        .filter((i) => i.statusGroup === 'LOST')
                        .map((item) => (
                          <StatusRow key={item.id} item={item} />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className='px-6 py-4 border-t border-border shrink-0 bg-muted/10'>
              <Button variant='ghost' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                disabled={!selectedTemplateId || applyMutation.isPending} 
                onClick={handleApply}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Aplicando...
                  </>
                ) : (
                  'Usar este Template'
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusRow({ item }: { item: TemplateItem }) {
  return (
    <div className='flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10'>
      <div className='flex items-center gap-3'>
        <div className='h-4 w-4 rounded-full' style={{ backgroundColor: item.color }} />
        <span className='font-medium text-sm'>{item.name}</span>
        {item.probability > 0 && item.probability < 100 && (
          <Badge variant='secondary' className='text-[10px] h-4 px-1'>
            {item.probability}%
          </Badge>
        )}
      </div>
      
      {item.suggestedMetaEventName && (
        <div className='flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded'>
          <Megaphone className='h-3 w-3' />
          Meta {item.suggestedMetaEventName}
        </div>
      )}
    </div>
  )
}
