'use client'

import { Megaphone, Plus, Settings2, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { apiFetch } from '@/lib/http/api-client'
import type { DealStageFormData } from '../types'

interface MetaPixel {
  id: string
  name: string | null
  pixelId: string
}

const standardEvents = [
  { name: 'Lead', label: 'Lead Captado' },
  { name: 'QualifiedLead', label: 'Lead Qualificado' },
  { name: 'Purchase', label: 'Venda Realizada' },
  { name: 'Schedule', label: 'Agendamento' },
  { name: 'Contact', label: 'Contato' },
  { name: 'CompleteRegistration', label: 'Cadastro Concluido' },
]

interface MetaRulesManagerProps {
  projectId?: string
  rules: DealStageFormData['metaRules']
  onChange: (rules: DealStageFormData['metaRules']) => void
}

export function MetaRulesManager({ projectId, rules, onChange }: MetaRulesManagerProps) {
  const { data: pixelsData } = useQuery<{ items: MetaPixel[] }>({
    queryKey: ['meta-pixels', projectId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/meta-ads/pixels', { projectId })
      return data as { items: MetaPixel[] }
    },
    enabled: !!projectId,
  })

  const addRule = () => {
    if (!pixelsData?.items?.length) {
      toast.error('Nenhum pixel configurado para este projeto')
      return
    }
    onChange([
      ...rules,
      {
        pixelId: pixelsData.items[0].id,
        eventName: 'Lead',
        fireOnce: true,
        includeEmail: true,
        includePhone: true,
        includeFullName: true,
        includeAddress: false,
        includeExternalId: true,
      },
    ])
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, updates: Partial<DealStageFormData['metaRules'][0]>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <Megaphone className='h-4 w-4' />
          <h4 className='font-medium text-sm'>Automações Meta CAPI</h4>
        </div>
        <Button type='button' variant='ghost' size='sm' onClick={addRule} className='h-8 gap-1.5'>
          <Plus className='h-3.5 w-3.5' />
          Adicionar regra
        </Button>
      </div>

      <div className='space-y-4'>
        {rules.map((rule, index) => (
          <div key={`${index}-${rule.pixelId}`} className='relative rounded-xl border border-border bg-muted/5 p-5'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute top-3 right-3 h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive'
              onClick={() => removeRule(index)}
            >
              <X className='h-4 w-4' />
            </Button>

            <div className='grid gap-6 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Pixel / Dataset
                </Label>
                <Select value={rule.pixelId} onValueChange={(v) => updateRule(index, { pixelId: v })}>
                  <SelectTrigger className='h-9 bg-background'>
                    <SelectValue placeholder='Selecione o pixel' />
                  </SelectTrigger>
                  <SelectContent>
                    {pixelsData?.items.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.pixelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Evento de Conversão
                </Label>
                <Select
                  value={standardEvents.some((e) => e.name === rule.eventName) ? rule.eventName : 'custom'}
                  onValueChange={(v) => updateRule(index, { eventName: v === 'custom' ? '' : v })}
                >
                  <SelectTrigger className='h-9 bg-background'>
                    <SelectValue placeholder='Selecione o evento' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Padrão Meta</SelectLabel>
                      {standardEvents.map((e) => (
                        <SelectItem key={e.name} value={e.name}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <Separator className='my-1' />
                    <SelectItem value='custom'>Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
                {!standardEvents.some((e) => e.name === rule.eventName) && (
                  <Input
                    className='mt-2 h-9 bg-background'
                    placeholder='Nome do evento (ex: LeadFrio)'
                    value={rule.eventName}
                    onChange={(e) => updateRule(index, { eventName: e.target.value })}
                  />
                )}
              </div>
            </div>

            <Separator className='my-6' />

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-medium'>Envio Único</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help' />
                      </TooltipTrigger>
                      <TooltipContent>
                        Evita disparar o mesmo evento múltiplas vezes se o lead voltar para esta fase.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={rule.fireOnce}
                  onCheckedChange={(v) => updateRule(index, { fireOnce: v })}
                />
              </div>

              <div className='space-y-3 rounded-lg bg-background p-4 border border-border/50'>
                <Label className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2'>
                  Mapeamento de Dados (Atribuição Avançada)
                </Label>
                <div className='grid grid-cols-2 gap-4'>
                  <DataToggle 
                    label="E-mail" 
                    checked={rule.includeEmail} 
                    onChange={(v) => updateRule(index, { includeEmail: v })} 
                  />
                  <DataToggle 
                    label="Telefone" 
                    checked={rule.includePhone} 
                    onChange={(v) => updateRule(index, { includePhone: v })} 
                  />
                  <DataToggle 
                    label="Nome Completo" 
                    checked={rule.includeFullName} 
                    onChange={(v) => updateRule(index, { includeFullName: v })} 
                  />
                  <DataToggle 
                    label="Endereço" 
                    checked={rule.includeAddress} 
                    onChange={(v) => updateRule(index, { includeAddress: v })} 
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center bg-muted/5'>
            <Settings2 className='h-10 w-10 text-muted-foreground/20' />
            <p className='mt-2 text-muted-foreground text-sm'>Nenhuma automação configurada para esta fase</p>
            <Button variant='link' size='sm' onClick={addRule} className='mt-2'>
              Clique para adicionar a primeira
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function DataToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <Switch className='scale-75' checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
