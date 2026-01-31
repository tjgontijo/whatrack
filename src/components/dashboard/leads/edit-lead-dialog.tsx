'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  applyWhatsAppMask,
  normalizeWhatsApp,
  validateWhatsApp,
  denormalizeWhatsApp,
} from '@/lib/mask/phone-mask'

const editLeadSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || validateWhatsApp(value), 'WhatsApp inválido'),
  mail: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
})

type EditLeadFormValues = z.infer<typeof editLeadSchema>

export type EditLeadDialogProps = {
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditLeadDialog({ leadId, open, onOpenChange, onSuccess }: EditLeadDialogProps) {
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadSchema),
  })

  // Fetch lead data when dialog opens
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${leadId}`)
      if (!res.ok) throw new Error('Falha ao carregar lead')
      return res.json()
    },
    enabled: open && !!leadId,
  })

  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name || '',
        phone: lead.phone ? applyWhatsAppMask(denormalizeWhatsApp(lead.phone)) : '',
        mail: lead.mail || '',
      })
    }
  }, [lead, reset])

  const submit = async (values: EditLeadFormValues) => {
    try {
      const payload = {
        ...values,
        phone: values.phone ? normalizeWhatsApp(values.phone) : undefined,
      }

      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erro ao atualizar lead (${response.status})`)
      }

      toast.success('Lead atualizado com sucesso!')
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Não foi possível atualizar o lead. Tente novamente.'
      toast.error(errorMessage)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>Atualize as informações do lead.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(submit)}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" placeholder="Nome completo" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <Input
                    id="edit-phone"
                    placeholder="Somente números"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(applyWhatsAppMask(e.target.value))}
                  />
                )}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mail">Email</Label>
              <Input id="edit-mail" type="email" placeholder="email@example.com" {...register('mail')} />
              {errors.mail && <p className="text-sm text-destructive">{errors.mail.message}</p>}
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
