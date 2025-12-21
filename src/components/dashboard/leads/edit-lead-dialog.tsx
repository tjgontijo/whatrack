'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_OPTIONS = [
  { label: 'Novo', value: 'new' },
  { label: 'Em contato', value: 'contacting' },
  { label: 'Qualificado', value: 'qualified' },
  { label: 'Negociação', value: 'negotiation' },
  { label: 'Ganho', value: 'won' },
  { label: 'Perdido', value: 'lost' },
] as const

const editLeadSchema = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  mail: z.string().email('Email inválido').optional().or(z.literal('')),
  assignedTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.string().optional(),
})

export type EditLeadFormValues = z.infer<typeof editLeadSchema>

export type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  assignedTo?: string | null
  notes?: string | null
  status?: string | null
}

export type EditLeadDialogProps = {
  lead: Lead
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditLeadDialog({ lead, onSuccess, trigger }: EditLeadDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: {
      name: lead.name || '',
      phone: lead.phone || '',
      mail: lead.mail || '',
      assignedTo: lead.assignedTo || '',
      notes: lead.notes || '',
      status: lead.status || 'new',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: lead.name || '',
        phone: lead.phone || '',
        mail: lead.mail || '',
        assignedTo: lead.assignedTo || '',
        notes: lead.notes || '',
        status: lead.status || 'new',
      })
    }
  }, [open, lead, reset])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset()
    }
  }

  const submit = async (values: EditLeadFormValues) => {
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erro ao atualizar lead (${response.status})`)
      }

      toast.success('Lead atualizado com sucesso!')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Não foi possível atualizar o lead. Tente novamente.'
      toast.error(errorMessage)
    }
  }

  const statusValue = watch('status')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>Atualize as informações do lead.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" placeholder="Nome completo" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input id="edit-phone" placeholder="(11) 99999-9999" {...register('phone')} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-mail">Email</Label>
            <Input id="edit-mail" type="email" placeholder="email@example.com" {...register('mail')} />
            {errors.mail && <p className="text-sm text-destructive">{errors.mail.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assignedTo">Responsável</Label>
            <Input id="edit-assignedTo" placeholder="Nome do responsável" {...register('assignedTo')} />
            {errors.assignedTo && <p className="text-sm text-destructive">{errors.assignedTo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select onValueChange={(value) => setValue('status', value)} value={statusValue}>
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea id="edit-notes" placeholder="Notas sobre o lead..." rows={4} {...register('notes')} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
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
                'Salvar alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
