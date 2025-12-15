"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

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
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

type CategoryFormDialogProps = {
  onSuccess?: () => void
}

export function CategoryFormDialog({ onSuccess }: CategoryFormDialogProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  })

  const closeDialog = () => {
    setOpen(false)
    reset()
  }

  const submit = async (values: FormValues) => {
    try {
      const response = await fetch('/api/v1/product-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: organizationId ?? '',
        },
        body: JSON.stringify({ name: values.name.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error ?? 'Falha ao criar categoria')
      }

      toast.success('Categoria criada')
      closeDialog()
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" className="cursor-pointer">
          Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
          <DialogDescription>Organize seus produtos em categorias.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome *</Label>
            <Input id="category-name" placeholder="Nome da categoria" {...register('name')} />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
