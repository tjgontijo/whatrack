'use client'

import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'

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
import { applyWhatsAppMask, normalizeWhatsApp, validateWhatsApp } from '@/lib/mask/phone-mask'
import { CrudEditDrawer } from '@/components/dashboard/crud'

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

export type NewLeadDrawerProps = {
  onSuccess?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'

export function NewLeadDrawer({
  onSuccess,
  open,
  onOpenChange,
}: NewLeadDrawerProps) {
  const setOpen = onOpenChange
  const { organizationId, projectId } = useRequiredProjectRouteContext()
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
      projectId,
    }

    try {
      await apiFetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        orgId: organizationId,
      })

      toast.success('Lead registrado com sucesso!')
      reset()
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o lead. Tente novamente.'
      toast.error(errorMessage)
    }
  }


  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title="Adicionar novo lead"
      subtitle="Preencha as informações para registrar um novo lead no funil comercial."
      icon={Users}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[720px]"
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="space-y-2">
          <Label htmlFor="lead-name">Nome *</Label>
          <Input id="lead-name" placeholder="Nome completo" {...register('name')} />
          {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
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
          {errors.whatsapp ? <p className="text-destructive text-sm">{errors.whatsapp.message}</p> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
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
            {errors.origin ? <p className="text-destructive text-sm">{errors.origin.message}</p> : null}
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
            {errors.medium ? <p className="text-destructive text-sm">{errors.medium.message}</p> : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
        </div>
      </form>
    </CrudEditDrawer>
  )
}
