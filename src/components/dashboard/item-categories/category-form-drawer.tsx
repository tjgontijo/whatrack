'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { CrudEditDrawer } from '@/components/dashboard/crud'

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  active: z.boolean(),
})

type FormValues = z.infer<typeof categorySchema>

export type CategoryFormData = {
  id: string
  name: string
  active: boolean
}

type CategoryFormDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryFormData | null
  onSuccess?: () => void
}

export function CategoryFormDrawer({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormDrawerProps) {
  const isEditMode = Boolean(category)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      active: true,
    },
  })

  useEffect(() => {
    if (!open) {
      reset({
        name: '',
        active: true,
      })
      return
    }

    if (category) {
      reset({
        name: category.name,
        active: category.active,
      })
    } else {
      reset({
        name: '',
        active: true,
      })
    }
  }, [open, category, reset])

  const closeDrawer = () => onOpenChange(false)

  const submit = async (values: FormValues) => {
    try {
      const response = await fetch(
        isEditMode ? `/api/v1/item-categories/${category!.id}` : '/api/v1/item-categories',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isEditMode
              ? { name: values.name.trim(), active: values.active }
              : { name: values.name.trim() }
          ),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error ?? 'Falha ao salvar categoria')
      }

      toast.success(isEditMode ? 'Categoria atualizada' : 'Categoria criada')
      closeDrawer()
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Editar categoria' : 'Nova categoria'}
      subtitle="Gerencie as categorias usadas no cadastro de itens."
      icon={Tag}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[640px]"
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="space-y-2">
          <Label htmlFor="category-name">Nome *</Label>
          <Input id="category-name" placeholder="Ex: Serviços premium" {...register('name')} />
          {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
        </div>

        {isEditMode && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Categoria ativa</p>
              <p className="text-muted-foreground text-xs">Desative para ocultar do cadastro de itens.</p>
            </div>
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={closeDrawer} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Criar categoria'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
