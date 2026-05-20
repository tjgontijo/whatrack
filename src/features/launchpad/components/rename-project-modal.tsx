'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

interface RenameProjectModalProps {
  projectId: string
  currentName: string
  onSuccess?: () => void
}

export function RenameProjectModal({
  projectId,
  currentName,
  onSuccess,
}: RenameProjectModalProps) {
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
      const res = await fetch(`/api/v1/projects/${projectId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao renomear projeto')
      }

      toast.success('Projeto renomeado com sucesso!')
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
        <FieldLabel htmlFor='project-name'>Nome do Projeto</FieldLabel>
        <Input
          id='project-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Digite o nome do seu projeto'
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
