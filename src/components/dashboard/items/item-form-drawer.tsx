'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package2, Plus } from 'lucide-react'
import { toast } from 'sonner'

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
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { CrudEditDrawer } from '@/components/dashboard/crud'

type CategoryOption = {
  id: string
  name: string
}

const NO_CATEGORY_VALUE = '__none__'
const CREATE_CATEGORY_VALUE = '__create__'

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  categoryId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type ItemFormDrawerProps = {
  categories: CategoryOption[]
  onSuccess?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItemFormDrawer({
  categories,
  onSuccess,
  open,
  onOpenChange,
}: ItemFormDrawerProps) {
  const { organizationId } = useRequiredProjectRouteContext()

  const setOpen = onOpenChange

  const [createdCategories, setCreatedCategories] = useState<CategoryOption[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [showCreateCategoryInput, setShowCreateCategoryInput] = useState(false)


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
    },
  })

  // Removido useEffect para sincronização via key prop no formulário

  const allCategories = useMemo(() => {
    const map = new Map<string, CategoryOption>()
    for (const category of categories) map.set(category.id, category)
    for (const category of createdCategories) map.set(category.id, category)
    return Array.from(map.values())
  }, [categories, createdCategories])

  const closeDrawer = () => {
    setOpen(false)
  }



  const createCategoryInline = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error('Digite o nome da categoria')
      return
    }

    setIsCreatingCategory(true)
    try {
      const created = (await apiFetch('/api/v1/item-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
        orgId: organizationId,
      })) as CategoryOption

      setCreatedCategories((prev) => [...prev, created])
      setValue('categoryId', created.id, { shouldDirty: true, shouldTouch: true })
      setNewCategoryName('')
      setShowCreateCategoryInput(false)
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
      await apiFetch('/api/v1/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name.trim(),
          categoryId: values.categoryId || undefined,
        }),
        orgId: organizationId,
      })

      toast.success('Item criado com sucesso')
      closeDrawer()
      onSuccess?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }


  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : closeDrawer())}
      title="Novo item"
      subtitle="Cadastre um item para uso em vendas e acompanhamento."
      icon={Package2}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[720px]"
    >
      <form
        key={open ? 'open' : 'closed'}
        className="space-y-5"
        onSubmit={handleSubmit(submit)}
      >
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
                onValueChange={(value) => {
                  if (value === CREATE_CATEGORY_VALUE) {
                    setShowCreateCategoryInput(true)
                    return
                  }

                  setShowCreateCategoryInput(false)
                  field.onChange(value === NO_CATEGORY_VALUE ? '' : value)
                }}
                value={field.value || NO_CATEGORY_VALUE}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY_VALUE}>Sem categoria</SelectItem>
                  <SelectItem value={CREATE_CATEGORY_VALUE}>+ Cadastrar nova categoria</SelectItem>
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

        {showCreateCategoryInput && (
          <div className="space-y-2">
            <Separator />
            <Label>Nova categoria</Label>
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
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={closeDrawer} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
