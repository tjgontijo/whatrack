'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

interface RenameOrganizationModalProps {
  organizationId: string
  currentName: string
  onSuccess?: () => void
}

export function RenameOrganizationModal({
  organizationId,
  currentName,
  onSuccess,
}: RenameOrganizationModalProps) {
  const [name, setName] = useState(currentName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/organization/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: name.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao renomear organização')
      }

      toast.success('Organização renomeada com sucesso!')
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor='org-name'>Nome da Organização</FieldLabel>
        <Input
          id='org-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Digite o nome da sua organização'
          disabled={isLoading}
          className='h-11 px-4'
        />
        {error && <FieldError errors={[{ message: error }]} />}
      </Field>

      <div className='flex gap-2 pt-2'>
        <Button type='submit' disabled={isLoading} className='flex-1'>
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
