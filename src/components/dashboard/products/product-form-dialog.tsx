"use client"

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

type CategoryOption = {
  id: string
  name: string
}

function normalizeNumeric(value?: string) {
  if (!value) return null
  const normalized = value.replace(',', '.').trim()
  if (!normalized.length) return null
  const numberValue = Number(normalized)
  return Number.isNaN(numberValue) ? null : numberValue
}

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  categoryId: z.string().optional(),
  price: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value.replace(',', '.'))), 'Valor inválido'),
  cost: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value.replace(',', '.'))), 'Valor inválido'),
})

type FormValues = z.infer<typeof formSchema>

type ProductFormDialogProps = {
  categories: CategoryOption[]
  onSuccess?: () => void
}

export function ProductFormDialog({ categories, onSuccess }: ProductFormDialogProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [open, setOpen] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      price: '',
      cost: '',
    },
  })

  const closeDialog = () => {
    setOpen(false)
    reset()
  }

  const submit = async (values: FormValues) => {
    try {
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: organizationId ?? '',
        },
        body: JSON.stringify({
          name: values.name.trim(),
          categoryId: values.categoryId || undefined,
          price: normalizeNumeric(values.price),
          cost: normalizeNumeric(values.cost),
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error ?? 'Falha ao criar produto')
      }

      toast.success('Produto criado com sucesso')
      closeDialog()
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button type="button" className="cursor-pointer">
          Novo produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>Cadastre um produto/serviço disponível para venda.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="product-name">Nome *</Label>
            <Input id="product-name" placeholder="Nome do produto" {...register('name')} />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                    onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                    value={field.value ?? '__none__'}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço sugerido</Label>
              <Input
                id="product-price"
                placeholder="Ex: 350"
                inputMode="decimal"
                {...register('price')}
              />
              {errors.price ? (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-cost">Custo</Label>
              <Input
                id="product-cost"
                placeholder="Ex: 150"
                inputMode="decimal"
                {...register('cost')}
              />
              {errors.cost ? (
                <p className="text-sm text-destructive">{errors.cost.message}</p>
              ) : null}
            </div>
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
