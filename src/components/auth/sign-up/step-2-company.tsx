'use client'

import { UseFormReturn } from 'react-hook-form'
import { useState } from 'react'
import { Building2, Search, Loader2, CheckCircle2 } from 'lucide-react'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SignUpCompleteData } from '@/schemas/sign-up'

interface Step2CompanyProps {
  form: UseFormReturn<SignUpCompleteData>
  onNext: () => void
  onBack: () => void
}

function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function Step2Company({ form, onNext, onBack }: Step2CompanyProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [companyFound, setCompanyFound] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const hasCnpj = form.watch('hasCnpj')
  const cnpj = form.watch('cnpj')
  const razaoSocial = form.watch('razaoSocial')

  const handleCnpjSearch = async () => {
    const cleanCnpj = cnpj?.replace(/\D/g, '') || ''
    if (cleanCnpj.length !== 14) {
      setSearchError('CNPJ deve ter 14 dígitos')
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(`/api/v1/company/lookup-public?cnpj=${cleanCnpj}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar CNPJ')
      }

      form.setValue('razaoSocial', data.razaoSocial)
      form.setValue('nomeFantasia', data.nomeFantasia || '')
      form.setValue('cnaeCode', data.cnaeCode)
      form.setValue('cnaeDescription', data.cnaeDescription)
      form.setValue('municipio', data.municipio)
      form.setValue('uf', data.uf)
      form.setValue('porte', data.porte || '')
      form.setValue('companyName', data.nomeFantasia || data.razaoSocial)
      
      setCompanyFound(true)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Erro ao buscar CNPJ')
      setCompanyFound(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleNext = async () => {
    if (hasCnpj) {
      if (!companyFound) {
        setSearchError('Busque o CNPJ antes de continuar')
        return
      }
    } else {
      const isValid = await form.trigger(['companyName'])
      if (!isValid) return
    }
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Qual é sua empresa?</h2>
        <p className="text-lg text-muted-foreground">
          Vamos buscar os dados automaticamente
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            form.setValue('hasCnpj', true)
            setCompanyFound(false)
            setSearchError(null)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all',
            hasCnpj
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <Building2 className={cn('h-6 w-6', hasCnpj ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-sm font-medium', hasCnpj ? 'text-primary' : 'text-muted-foreground')}>
            Tenho CNPJ
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            form.setValue('hasCnpj', false)
            setCompanyFound(false)
            setSearchError(null)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all',
            !hasCnpj
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <Building2 className={cn('h-6 w-6', !hasCnpj ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-sm font-medium', !hasCnpj ? 'text-primary' : 'text-muted-foreground')}>
            Ainda não tenho
          </span>
        </button>
      </div>

      {hasCnpj ? (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(applyCnpjMask(e.target.value))}
                      disabled={isSearching || companyFound}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant={companyFound ? 'outline' : 'default'}
                    onClick={handleCnpjSearch}
                    disabled={isSearching || (cnpj?.replace(/\D/g, '').length !== 14)}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : companyFound ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <FormMessage />
                {searchError && (
                  <p className="text-sm text-destructive">{searchError}</p>
                )}
              </FormItem>
            )}
          />

          {companyFound && razaoSocial && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Dados encontrados
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Razão Social</Label>
                  <p className="text-sm font-medium">{form.watch('razaoSocial')}</p>
                </div>
                
                {form.watch('nomeFantasia') && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                    <p className="text-sm font-medium">{form.watch('nomeFantasia')}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-muted-foreground">CNAE</Label>
                  <p className="text-sm">{form.watch('cnaeCode')} - {form.watch('cnaeDescription')}</p>
                </div>
                
                {form.watch('porte') && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Porte</Label>
                    <p className="text-sm">{form.watch('porte')}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-muted-foreground">Localização</Label>
                  <p className="text-sm">{form.watch('municipio')} / {form.watch('uf')}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setCompanyFound(false)
                  form.setValue('razaoSocial', '')
                  form.setValue('nomeFantasia', '')
                  form.setValue('cnaeCode', '')
                  form.setValue('cnaeDescription', '')
                  form.setValue('municipio', '')
                  form.setValue('uf', '')
                  form.setValue('porte', '')
                  form.setValue('cnpj', '')
                }}
              >
                Buscar outro CNPJ
              </Button>
            </div>
          )}
        </div>
      ) : (
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input
                  placeholder="Minha Empresa"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" className="flex-1" onClick={handleNext}>
          Próximo
        </Button>
      </div>
    </div>
  )
}
