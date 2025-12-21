'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  applyWhatsAppMask,
  normalizeWhatsApp,
  validateWhatsApp,
} from '@/lib/mask/phone-mask'

const ORIGIN_OPTIONS = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Messenger', value: 'Messenger' },
  { label: 'Whatsapp', value: 'Whatsapp' },
  { label: 'Indicação', value: 'Indicação' },
  { label: 'Ligação', value: 'Ligação' },
  { label: 'Balcão', value: 'Balcão' },
  { label: 'Google Meu Negócio', value: 'Google Meu Negócio' },
  { label: 'Banner Externo', value: 'Banner Externo' },
  { label: 'Flyer', value: 'Flyer' },
  { label: 'Evento', value: 'Evento' },
  { label: 'Parceria Comercial', value: 'Parceria Comercial' },
  { label: 'Reativação de Cliente Antigo', value: 'Reativação de Cliente Antigo' },
] as const

const MEDIUM_OPTIONS = [
  { label: 'Pago', value: 'Pago' },
  { label: 'Orgânico', value: 'Orgânico' },
] as const

const originValues = new Set<string>(ORIGIN_OPTIONS.map((option) => option.value))
const mediumValues = new Set<string>(MEDIUM_OPTIONS.map((option) => option.value))

const createLeadSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || validateWhatsApp(value), 'Informe um WhatsApp válido'),
  origin: z
    .string()
    .trim()
    .min(1, 'Selecione uma origem')
    .refine((value) => originValues.has(value), 'Selecione uma origem válida'),
  medium: z
    .string()
    .trim()
    .min(1, 'Selecione um meio')
    .refine((value) => mediumValues.has(value), 'Selecione um meio válido'),
})

export type CreateLeadFormValues = z.infer<typeof createLeadSchema>

export type NewLeadDialogProps = {
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function NewLeadDialog({ onSuccess, open: controlledOpen, onOpenChange }: NewLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOpen !== undefined ? onOpenChange || (() => {}) : setInternalOpen
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
      origin: '',
      medium: '',
    },
  })

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset()
    }
  }

  const submit = async (values: CreateLeadFormValues) => {
    const payload = {
      name: values.name,
      phone: values.whatsapp ? normalizeWhatsApp(values.whatsapp) : undefined,
      notes: `Origem: ${values.origin}, Meio: ${values.medium}`,
    }

    try {
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erro ao criar lead (${response.status})`)
      }

      toast.success('Lead registrado com sucesso!')
      reset()
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível registrar o lead. Tente novamente.'
      toast.error(errorMessage)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button type="button" className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar novo lead</DialogTitle>
          <DialogDescription>
            Preencha as informações para registrar um novo lead no funil comercial.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" placeholder="Nome completo" {...register('name')} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-whatsapp">WhatsApp</Label>
            <Controller
              control={control}
              name="whatsapp"
              render={({ field }) => (
                <Input
                  id="lead-whatsapp"
                  inputMode="tel"
                  placeholder="Somente números"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(applyWhatsAppMask(event.target.value))}
                />
              )}
            />
            {errors.whatsapp ? <p className="text-sm text-destructive">{errors.whatsapp.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Origem *</Label>
              <Controller
                control={control}
                name="origin"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGIN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.origin ? <p className="text-sm text-destructive">{errors.origin.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Meio *</Label>
              <Controller
                control={control}
                name="medium"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIUM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.medium ? <p className="text-sm text-destructive">{errors.medium.message}</p> : null}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                'Salvar lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
