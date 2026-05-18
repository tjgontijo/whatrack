'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrudEditDrawer } from '@/features/dashboard/components/crud'
import { useOrganization } from '@/features/organizations/hooks/use-organization'
import { type ProjectListItem, projectCreateSchema } from '@/features/projects'
import { apiFetch } from '@/lib/http/api-client'
import { normalizeSlug } from '@/lib/utils/slug'

type ProjectFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectListItem | null
  onSuccess?: () => void
}

type ProjectFormValues = {
  name: string
  slug: string
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) {
  const isEditMode = Boolean(project)
  const { data: organization } = useOrganization()
  const [hasEditedSlug, setHasEditedSlug] = useState(Boolean(project?.slug))
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: project?.name ?? '',
      slug: project?.slug ?? '',
    },
  })

  const watchedName = watch('name')
  const watchedSlug = watch('slug')

  useEffect(() => {
    if (isEditMode || hasEditedSlug) return

    setValue('slug', normalizeSlug(watchedName), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [hasEditedSlug, isEditMode, setValue, watchedName])

  useEffect(() => {
    reset({
      name: project?.name ?? '',
      slug: project?.slug ?? '',
    })
    setHasEditedSlug(Boolean(project?.slug))
  }, [project, reset])

  const slugCheckEnabled = useMemo(
    () => Boolean(organization?.id && watchedSlug && !errors.slug),
    [organization?.id, watchedSlug, errors.slug]
  )

  const { data: slugCheck, isFetching: isCheckingSlug } = useQuery<{
    available: boolean
    slug: string
  }>({
    queryKey: ['project-slug-check', organization?.id, watchedSlug, project?.id],
    queryFn: async () => {
      const url = new URL('/api/v1/projects/slug', window.location.origin)
      url.searchParams.set('slug', watchedSlug)
      if (project?.id) {
        url.searchParams.set('excludeProjectId', project.id)
      }
      return apiFetch(url.toString(), {
        orgId: organization?.id,
      }) as Promise<{ available: boolean; slug: string }>
    },
    enabled: slugCheckEnabled,
    staleTime: 0,
  })

  const slugIsAvailable = slugCheck?.available ?? false

  async function submit(values: ProjectFormValues) {
    try {
      if (!slugIsAvailable) {
        toast.error('Escolha um slug disponível antes de salvar')
        return
      }

      await apiFetch(isEditMode ? `/api/v1/projects/${project?.id}` : '/api/v1/projects', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      toast.success(isEditMode ? 'Projeto atualizado' : 'Projeto criado')
      onOpenChange(false)
      onSuccess?.()
      reset({ name: '', slug: '' })
      setHasEditedSlug(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar projeto')
    }
  }

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Editar projeto' : 'Novo projeto'}
      subtitle='Cada projeto representa um cliente operacional da sua agência dentro do WhaTrack.'
      icon={FolderKanban}
      showFooter={false}
      desktopDirection='right'
      mobileDirection='bottom'
      maxWidth='max-w-[720px]'
      desktopPanelWidthClassName='data-[side=right]:!w-[min(96vw,760px)] data-[side=right]:sm:!max-w-none'
    >
      <form className='space-y-6' onSubmit={handleSubmit(submit)}>
        <div className='space-y-2'>
          <label htmlFor='project-name' className='font-medium text-sm'>
            Nome do projeto
          </label>
          <Input id='project-name' placeholder='Cliente Acme' {...register('name')} />
          <p className='text-muted-foreground text-sm'>
            Use o nome do cliente ou da conta operacional que sua agência vai gerenciar.
          </p>
          {errors.name ? <p className='text-red-500 text-sm'>{errors.name.message}</p> : null}
        </div>

        <div className='space-y-2'>
          <label htmlFor='project-slug' className='font-medium text-sm'>
            Slug do projeto
          </label>
          <Input
            id='project-slug'
            placeholder='cliente-acme'
            {...register('slug', {
              onChange: (event) => {
                setHasEditedSlug(true)
                event.target.value = normalizeSlug(event.target.value)
              },
            })}
          />
          <p className='text-muted-foreground text-sm'>
            Escolha o identificador público do projeto na URL.
          </p>
          {errors.slug ? (
            <p className='text-red-500 text-sm'>{errors.slug.message}</p>
          ) : watchedSlug ? (
            <p className={`text-sm ${slugIsAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isCheckingSlug
                ? 'Verificando disponibilidade...'
                : slugIsAvailable
                  ? 'Slug disponível'
                  : 'Slug já está em uso'}
            </p>
          ) : null}
        </div>

        <div className='flex justify-end gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type='submit' disabled={isSubmitting || !slugIsAvailable}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar projeto' : 'Criar projeto'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
