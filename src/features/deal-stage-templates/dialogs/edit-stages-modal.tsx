'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  Loader2,
  Megaphone,
  Settings2,
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
  isPopular: boolean
  items: TemplateItem[]
}

interface EditStagesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  organizationId: string
  currentStages: any[]
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
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleApply = () => {
    if (!selectedTemplateId) return
    
    const hasDeals = currentStages.some(s => s.dealsCount > 0)
    
    if (hasDeals) {
      if (confirm('Atenção: Este projeto já possui negociações. Aplicar um novo template irá mover todas as negociações existentes para a nova fase inicial do template. Deseja continuar?')) {
        applyMutation.mutate(selectedTemplateId)
      }
    } else if (currentStages.length > 0) {
      if (confirm('Deseja substituir suas fases atuais pelas fases deste template?')) {
        applyMutation.mutate(selectedTemplateId)
      }
    } else {
      applyMutation.mutate(selectedTemplateId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] max-w-5xl flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl'>
        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar: Templates */}
          <div className='w-72 border-r border-border bg-muted/20 p-6 overflow-y-auto'>
            <div className='mb-6'>
              <h3 className='font-bold text-base tracking-tight'>Template Center</h3>
              <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mt-1'>Modelos Estratégicos</p>
            </div>
            
            <div className='space-y-1.5'>
              {isLoadingTemplates ? (
                <div className='flex flex-col items-center justify-center py-12 gap-3'>
                  <Loader2 className='h-6 w-6 animate-spin text-primary/40' />
                  <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest'>Carregando...</p>
                </div>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 border-2',
                      selectedTemplateId === t.id
                        ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-md translate-x-1'
                        : 'hover:bg-muted border-transparent text-muted-foreground hover:translate-x-1'
                    )}
                  >
                    {t.name}
                    {t.isPopular && (
                      <Badge className='ml-2 bg-yellow-400 text-black hover:bg-yellow-400 border-none text-[9px] h-4 px-1.5'>POPULAR</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main: Preview */}
          <div className='flex-1 flex flex-col min-w-0 bg-background overflow-hidden'>
            <DialogHeader className='px-8 py-6 border-b border-border shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10'>
              <div className='flex items-center justify-between'>
                <div>
                  <DialogTitle className='text-xl font-bold tracking-tight'>
                    {selectedTemplate ? selectedTemplate.name : 'Escolha sua Metodologia'}
                  </DialogTitle>
                  {selectedTemplate?.description && (
                    <p className='text-sm text-muted-foreground mt-1'>{selectedTemplate.description}</p>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar'>
              {!selectedTemplate ? (
                <div className='h-full flex flex-col items-center justify-center text-center px-12'>
                  <div className='bg-muted/30 p-6 rounded-full mb-6'>
                    <Settings2 className='h-12 w-12 text-primary/20' />
                  </div>
                  <h4 className='font-bold text-lg tracking-tight'>Inicie com um processo validado</h4>
                  <p className='text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed'>
                    Selecione um modelo de indústria à esquerda para visualizar as fases sugeridas e as automações Meta CAPI inclusas.
                  </p>
                </div>
              ) : (
                <>
                  <GroupSection 
                    title="EM ANDAMENTO (ACTIVE)" 
                    colorClass="text-blue-600" 
                    items={selectedTemplate.items.filter(i => i.statusGroup === 'ACTIVE')} 
                  />
                  
                  <GroupSection 
                    title="FECHAMENTO (WON)" 
                    colorClass="text-green-600" 
                    items={selectedTemplate.items.filter(i => i.statusGroup === 'WON')} 
                  />

                  <GroupSection 
                    title="PERDA (LOST)" 
                    colorClass="text-red-600" 
                    items={selectedTemplate.items.filter(i => i.statusGroup === 'LOST')} 
                  />
                </>
              )}
            </div>

            <DialogFooter className='px-8 py-5 border-t border-border shrink-0 bg-muted/5'>
              <Button variant='ghost' className='rounded-full px-6' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                className='rounded-full px-8 font-bold shadow-lg transition-all active:scale-95'
                disabled={!selectedTemplateId || applyMutation.isPending} 
                onClick={handleApply}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Instalando Metodologia...
                  </>
                ) : (
                  'Aplicar este Funil'
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GroupSection({ title, colorClass, items }: { title: string, colorClass: string, items: TemplateItem[] }) {
  if (items.length === 0) return null
  
  return (
    <div className='space-y-4'>
      <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]', colorClass)}>
        <ChevronRight className='h-3 w-3 stroke-[3px]' />
        {title}
      </div>
      <div className='space-y-2.5'>
        {items.map((item) => (
          <div key={item.id} className='flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all group'>
            <div className='flex items-center gap-4'>
              <div className='h-3 w-3 rounded-full shadow-inner' style={{ backgroundColor: item.color }} />
              <span className='font-bold text-sm tracking-tight'>{item.name}</span>
              {item.probability > 0 && item.probability < 100 && (
                <Badge variant='secondary' className='text-[10px] font-black h-5 px-1.5 bg-muted/50'>
                  {item.probability}%
                </Badge>
              )}
            </div>
            
            {item.suggestedMetaEventName && (
              <div className='flex items-center gap-1.5 text-[9px] text-primary uppercase font-black tracking-widest bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-full'>
                <Megaphone className='h-3 w-3' />
                CAPI: {item.suggestedMetaEventName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
