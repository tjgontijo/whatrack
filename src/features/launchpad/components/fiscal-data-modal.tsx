'use client'

import { Building2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateDocumentByType } from '@/lib/document/document-identity'
import { applyCpfCnpjMask, stripCpfCnpj, type CpfCnpjType } from '@/lib/mask/cpf-cnpj'

interface FiscalDataModalProps {
  organizationId: string
  onSuccess?: (payload: { optimistic: boolean }) => void
}

export function FiscalDataModal({ organizationId, onSuccess }: FiscalDataModalProps) {
  const [documentType, setDocumentType] = useState<CpfCnpjType | null>(null)
  const [documentNumber, setDocumentNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const masked = documentType ? applyCpfCnpjMask(documentNumber, documentType) : documentNumber

  async function handleSubmit() {
    if (!documentType) {
      toast.error('Selecione Pessoa Física ou Pessoa Jurídica')
      return
    }

    const normalizedDocument = stripCpfCnpj(documentNumber)

    if (!validateDocumentByType(documentType, normalizedDocument)) {
      toast.error(`${documentType.toUpperCase()} inválido`)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/organization/${organizationId}/fiscal-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentNumber: normalizedDocument,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar dados fiscais')
      }

      if (documentType === 'cnpj') {
        toast.success('CNPJ enviado. Vamos concluir o cadastro em segundo plano.')
      } else {
        toast.success('Dados fiscais salvos com sucesso')
      }
      onSuccess?.({ optimistic: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar dados fiscais'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='space-y-3'>
        <Label>Tipo de cadastro</Label>
        <div className='grid grid-cols-2 gap-3'>
          <button
            type='button'
            onClick={() => {
              setDocumentType('cpf')
              setDocumentNumber('')
            }}
            disabled={isLoading}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all ${
              documentType === 'cpf'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
              <UserRound className='h-5 w-5 text-foreground' />
            </div>
            <p className='font-semibold text-foreground text-sm'>Pessoa Física</p>
          </button>
          <button
            type='button'
            onClick={() => {
              setDocumentType('cnpj')
              setDocumentNumber('')
            }}
            disabled={isLoading}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all ${
              documentType === 'cnpj'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
              <Building2 className='h-5 w-5 text-foreground' />
            </div>
            <p className='font-semibold text-foreground text-sm'>Pessoa Jurídica</p>
          </button>
        </div>
      </div>

      {documentType ? (
        <div className='space-y-2'>
          <Label htmlFor='fiscal-document'>{documentType === 'cnpj' ? 'CNPJ' : 'CPF'}</Label>
          <Input
            id='fiscal-document'
            value={masked}
            onChange={(event) => setDocumentNumber(stripCpfCnpj(event.target.value))}
            placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
            disabled={isLoading}
            className='h-11 px-4'
          />
        </div>
      ) : null}

      <Button type='button' onClick={handleSubmit} disabled={isLoading || !documentType} className='w-full'>
        {isLoading ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
