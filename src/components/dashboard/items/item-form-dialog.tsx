'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
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

type ItemFormDialogProps = {
  categories: CategoryOption[]
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ItemFormDialog({
  categories,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: ItemFormDialogProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id

  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOpen !== undefined ? onOpenChange || (() => {}) : setInternalOpen

  const [createdCategories, setCreatedCategories] = useState<CategoryOption[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const {
    control,
    register,
    setValue,
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

  useEffect(() => {
    if (!open) {
      setCreatedCategories([])
      setNewCategoryName('')
    }
  }, [open])

  const allCategories = useMemo(() => {
    const map = new Map<string, CategoryOption>()
    for (const category of categories) map.set(category.id, category)
    for (const category of createdCategories) map.set(category.id, category)
    return Array.from(map.values())
  }, [categories, createdCategories])

  const closeDialog = () => {
    setOpen(false)
    reset()
    setCreatedCategories([])
    setNewCategoryName('')
  }

  const createCategoryInline = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error('Digite o nome da categoria')
      return
    }

    setIsCreatingCategory(true)
    try {
      const response = await fetch('/api/v1/item-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: organizationId ?? '',
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error ?? 'Falha ao criar categoria')
      }

      const created = (await response.json()) as CategoryOption
      setCreatedCategories((prev) => [...prev, created])
      setValue('categoryId', created.id)
      setNewCategoryName('')
      toast.success('Categoria criada')
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const submit = async (values: FormValues) => {
    try {
      const response = await fetch('/api/v1/items', {
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
        throw new Error(error?.error ?? 'Falha ao criar item')
      }

      toast.success('Item criado com sucesso')
      closeDialog()
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button type="button" className="cursor-pointer">
            Novo item
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>Cadastre um item para uso em vendas e acompanhamento.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="item-name">Nome *</Label>
            <Input id="item-name" placeholder="Nome do item" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
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
                    {allCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Separator />
            <Label>Nova categoria (inline)</Label>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Digite o nome da categoria"
              />
              <Button
                type="button"
                variant="outline"
                onClick={createCategoryInline}
                disabled={isCreatingCategory}
              >
                <Plus className="mr-1 h-4 w-4" />
                {isCreatingCategory ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-price">Preço sugerido</Label>
              <Input id="item-price" placeholder="Ex: 350" inputMode="decimal" {...register('price')} />
              {errors.price ? (
                <p className="text-destructive text-sm">{errors.price.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-cost">Custo</Label>
              <Input id="item-cost" placeholder="Ex: 150" inputMode="decimal" {...register('cost')} />
              {errors.cost ? (
                <p className="text-destructive text-sm">{errors.cost.message}</p>
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
