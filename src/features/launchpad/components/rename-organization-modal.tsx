'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'

const step1Schema = z.object({
  organizationName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
})

const step2Schema = z.object({
  documentType: z.enum(['cpf', 'cnpj']),
  documentNumber: z.string().min(1, 'Documento é obrigatório'),
  companyName: z.string().optional(),
  companyFantasyName: z.string().optional(),
  municipality: z.string().optional(),
  state: z.string().optional(),
})

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
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { organizationName: currentName },
  })

  const form2 = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { documentType: 'cnpj', documentNumber: '' },
  })

  const documentType = form2.watch('documentType')
  const documentNumber = form2.watch('documentNumber')

  async function handleStep1Submit(values: z.infer<typeof step1Schema>) {
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

      toast.success('Organização renomeada!')
      setStep(2)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear'
      form1.setError('organizationName', { message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStep2Submit(values: z.infer<typeof step2Schema>) {
    setIsLoading(true)
    try {
      const normalizedDocument = stripCpfCnpj(values.documentNumber)

      const res = await fetch(`/api/v1/organization/${organizationId}/fiscal-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: values.documentType,
          documentNumber: normalizedDocument,
          companyName: values.companyName,
          companyFantasyName: values.companyFantasyName,
          municipality: values.municipality,
          state: values.state,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar dados')
      }

      toast.success('Dados fiscais salvos com sucesso!')
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      form2.setError('documentNumber', { message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {step === 1 ? (
        <form onSubmit={form1.handleSubmit(handleStep1Submit)} className='space-y-4'>
          <Field data-invalid={!!form1.formState.errors.organizationName}>
            <FieldLabel htmlFor='org-name'>Nome da Organização</FieldLabel>
            <Input
              id='org-name'
              {...form1.register('organizationName')}
              placeholder='Digite o nome da sua organização'
              disabled={isLoading}
              className='h-11 px-4'
            />
            <FieldError errors={[form1.formState.errors.organizationName]} />
          </Field>

          <div className='flex gap-2 pt-2'>
            <Button type='submit' disabled={isLoading} className='flex-1'>
              {isLoading ? 'Salvando...' : 'Próximo'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={form2.handleSubmit(handleStep2Submit)} className='space-y-4'>
          <Field data-invalid={!!form2.formState.errors.documentType}>
            <FieldLabel htmlFor='documentType'>Tipo de Documento</FieldLabel>
            <Select
              value={documentType}
              onValueChange={(value) => {
                form2.setValue('documentType', value as 'cpf' | 'cnpj')
                form2.setValue('documentNumber', '')
              }}
              disabled={isLoading}
            >
              <SelectTrigger id='documentType' className='h-11'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='cpf'>CPF (Pessoa Física)</SelectItem>
                <SelectItem value='cnpj'>CNPJ (Pessoa Jurídica)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={!!form2.formState.errors.documentNumber}>
            <FieldLabel htmlFor='documentNumber'>
              {documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
            </FieldLabel>
            <Input
              id='documentNumber'
              value={applyCpfCnpjMask(documentNumber, documentType)}
              onChange={(e) => {
                const cleaned = stripCpfCnpj(e.target.value)
                form2.setValue('documentNumber', cleaned)
              }}
              placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
              disabled={isLoading}
              className='h-11 px-4'
            />
            <FieldError errors={[form2.formState.errors.documentNumber]} />
          </Field>

          {documentType === 'cnpj' && (
            <>
              <Field>
                <FieldLabel htmlFor='companyName'>Razão Social (opcional)</FieldLabel>
                <Input
                  id='companyName'
                  {...form2.register('companyName')}
                  placeholder='Nome da empresa'
                  disabled={isLoading}
                  className='h-11 px-4'
                />
              </Field>

              <Field>
                <FieldLabel htmlFor='companyFantasyName'>Nome Fantasia (opcional)</FieldLabel>
                <Input
                  id='companyFantasyName'
                  {...form2.register('companyFantasyName')}
                  placeholder='Como a empresa é conhecida'
                  disabled={isLoading}
                  className='h-11 px-4'
                />
              </Field>

              <div className='grid grid-cols-2 gap-3'>
                <Field>
                  <FieldLabel htmlFor='municipality'>Município (opcional)</FieldLabel>
                  <Input
                    id='municipality'
                    {...form2.register('municipality')}
                    placeholder='São Paulo'
                    disabled={isLoading}
                    className='h-11 px-4'
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor='state'>UF (opcional)</FieldLabel>
                  <Input
                    id='state'
                    {...form2.register('state')}
                    placeholder='SP'
                    disabled={isLoading}
                    className='h-11 px-4'
                    maxLength={2}
                  />
                </Field>
              </div>
            </>
          )}

          <div className='flex gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              disabled={isLoading}
              onClick={() => setStep(1)}
              className='flex-1'
            >
              Voltar
            </Button>
            <Button type='submit' disabled={isLoading} className='flex-1'>
              {isLoading ? 'Salvando...' : 'Concluir'}
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
