'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FolderKanban } from 'lucide-react'
import { toast } from 'sonner'

import { CrudEditDrawer } from '@/components/dashboard/crud'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api-client'
import {
  projectCreateSchema,
  type ProjectListItem,
} from '@/schemas/projects/project-schemas'

type ProjectFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectListItem | null
  onSuccess?: () => void
}

type ProjectFormValues = {
  name: string
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) {
  const isEditMode = Boolean(project)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: project?.name ?? '',
    },
  })

  useEffect(() => {
    reset({
      name: project?.name ?? '',
    })
  }, [project, reset, open])

  async function submit(values: ProjectFormValues) {
    try {
      await apiFetch(
        isEditMode ? `/api/v1/projects/${project!.id}` : '/api/v1/projects',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        },
      )

      toast.success(isEditMode ? 'Projeto atualizado' : 'Projeto criado')
      onOpenChange(false)
      onSuccess?.()
      reset({ name: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar projeto')
    }
  }

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Editar projeto' : 'Novo projeto'}
      subtitle="Cada projeto representa um cliente operacional da sua agência dentro do WhaTrack."
      icon={FolderKanban}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[720px]"
      desktopPanelWidthClassName="data-[side=right]:!w-[min(96vw,760px)] data-[side=right]:sm:!max-w-none"
    >
      <form className="space-y-6" onSubmit={handleSubmit(submit)}>
        <div className="space-y-2">
          <label htmlFor="project-name" className="text-sm font-medium">
            Nome do projeto
          </label>
          <Input
            id="project-name"
            placeholder="Cliente Acme"
            {...register('name')}
          />
          <p className="text-muted-foreground text-sm">
            Use o nome do cliente ou da conta operacional que sua agência vai gerenciar.
          </p>
          {errors.name ? (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar projeto' : 'Criar projeto'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
