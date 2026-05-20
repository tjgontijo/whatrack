'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

const schema = z.object({
  organizationName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
})

interface RenameOrganizationModalProps {
  organizationId: string
  onSuccess?: (data: { slug: string }) => void
}

export function RenameOrganizationModal({
  organizationId,
  onSuccess,
}: RenameOrganizationModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { organizationName: '' },
  })

  async function handleSubmit(values: z.infer<typeof schema>) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/organization/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: values.organizationName.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao renomear organização')
      }

      const data = (await res.json()) as { slug: string }
      toast.success('Organização renomeada!')
      onSuccess?.({ slug: data.slug })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear'
      form.setError('organizationName', { message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
      <Field data-invalid={!!form.formState.errors.organizationName}>
        <FieldLabel htmlFor='org-name'>Nome da Organização</FieldLabel>
        <Input
          id='org-name'
          {...form.register('organizationName')}
          placeholder='Digite o nome da sua organização'
          autoFocus
          disabled={isLoading}
          className='h-11 px-4'
        />
        <FieldError errors={[form.formState.errors.organizationName]} />
      </Field>

      <div className='flex gap-2 pt-2'>
        <Button type='submit' disabled={isLoading} className='flex-1'>
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
