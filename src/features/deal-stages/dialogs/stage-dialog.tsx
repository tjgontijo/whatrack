'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetaRulesManager } from '../components/meta-rules-manager'
import type { DealStage, DealStageFormData } from '../types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', 
  '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
] as const

interface StageDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  stage: DealStage | null
  projectId?: string
  onSave: (data: DealStageFormData) => void
  isSaving: boolean
}

export function StageDialog({
  open,
  onOpenChange,
  stage,
  projectId,
  onSave,
  isSaving,
}: StageDialogProps) {
  const [form, setForm] = useState<DealStageFormData>({
    name: '',
    color: PRESET_COLORS[0],
    statusGroup: 'ACTIVE',
    probability: 50,
    isDefault: false,
    isClosed: false,
    metaRules: [],
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: stage?.name ?? '',
        color: stage?.color ?? PRESET_COLORS[0],
        statusGroup: stage?.statusGroup ?? 'ACTIVE',
        probability: stage?.probability ?? 50,
        isDefault: stage?.isDefault ?? false,
        isClosed: stage?.isClosed ?? false,
        metaRules: stage?.metaRules.map(r => ({
          pixelId: r.pixelId,
          eventName: r.eventName,
          fireOnce: r.fireOnce,
          includeEmail: r.includeEmail,
          includePhone: r.includePhone,
          includeFullName: r.includeFullName,
          includeAddress: r.includeAddress,
          includeExternalId: r.includeExternalId,
        })) ?? [],
      })
    }
  }, [open, stage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue='general' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='general'>Geral</TabsTrigger>
            <TabsTrigger value='automations'>Automações</TabsTrigger>
          </TabsList>
          
          <TabsContent value='general' className='space-y-6 py-4'>
            <div className='space-y-2'>
              <Label>Nome da fase</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Ex: Em análise'
                autoFocus
              />
            </div>

            <div className='space-y-2'>
              <Label>Cor</Label>
              <div className='flex flex-wrap gap-2'>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type='button'
                    className='h-7 w-7 rounded-full border-2 transition-all'
                    style={{
                      backgroundColor: color,
                      borderColor: form.color === color ? 'white' : 'transparent',
                      outline: form.color === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '1px',
                    }}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                  />
                ))}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='flex items-center justify-between rounded-lg border border-border px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-4 w-4 text-primary' />
                  <p className='font-medium text-sm'>Padrão</p>
                </div>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
                />
              </div>

              <div className='flex items-center justify-between rounded-lg border border-border px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <XCircle className='h-4 w-4 text-muted-foreground' />
                  <p className='font-medium text-sm'>Fechamento</p>
                </div>
                <Switch
                  checked={form.isClosed}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isClosed: v }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='automations' className='py-4'>
            <MetaRulesManager
              projectId={projectId}
              rules={form.metaRules}
              onChange={(rules) => setForm((f) => ({ ...f, metaRules: rules }))}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className='mt-6'>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
