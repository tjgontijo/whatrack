'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CircleAlert, CircleCheckBig, User } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import type { CompanyLookupData } from '@/schemas/organizations/organization-onboarding'
import { welcomeOnboardingSchema, type WelcomeOnboardingInput } from '@/schemas/onboarding/welcome-onboarding'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils/utils'

type WelcomeOnboardingFormProps = {
  defaultOrganizationName: string
}

type LookupFeedback =
  | {
      kind: 'success'
      title: string
      description: string
    }
  | {
      kind: 'fallback'
      title: string
      description: string
    }
  | null

export function WelcomeOnboardingForm({
  defaultOrganizationName,
}: WelcomeOnboardingFormProps) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [lookupFeedback, setLookupFeedback] = useState<LookupFeedback>(null)
  const form = useForm<WelcomeOnboardingInput>({
    resolver: zodResolver(welcomeOnboardingSchema),
    defaultValues: {
      organizationName: defaultOrganizationName,
      documentNumber: '',
    },
  })
  const identityType = form.watch('identityType')
  const companyLookupData = form.watch('companyLookupData')
  const documentType = identityType === 'pessoa_juridica' ? 'cnpj' : identityType === 'pessoa_fisica' ? 'cpf' : null
  const documentLabel = documentType === 'cnpj' ? 'CNPJ' : documentType === 'cpf' ? 'CPF' : 'CPF ou CNPJ'
  const documentPlaceholder =
    documentType === 'cnpj' ? '00.000.000/0000-00' : documentType === 'cpf' ? '000.000.000-00' : 'Selecione o tipo primeiro'
  const companySummary = useMemo(() => {
    if (!companyLookupData) return null

    const location =
      companyLookupData.municipio && companyLookupData.uf
        ? `${companyLookupData.municipio}/${companyLookupData.uf}`
        : null

    return [companyLookupData.razaoSocial, companyLookupData.nomeFantasia, location]
      .filter(Boolean)
      .join(' • ')
  }, [companyLookupData])

  async function resolveCompanyLookupData(documentNumber: string): Promise<CompanyLookupData | undefined> {
    try {
      const payload = (await apiFetch(`/api/v1/company/lookup?cnpj=${documentNumber}`)) as CompanyLookupData
      form.setValue('companyLookupData', payload, { shouldDirty: true })
      setLookupFeedback({
        kind: 'success',
        title: 'Dados da Receita encontrados',
        description: 'Usaremos os dados consultados para enriquecer o cadastro.',
      })
      return payload
    } catch {
      form.setValue('companyLookupData', undefined, { shouldDirty: true })
      setLookupFeedback({
        kind: 'fallback',
        title: 'Seguiremos apenas com o CNPJ',
        description: 'A consulta da Receita falhou agora. O cadastro será concluído com o documento informado.',
      })
      return undefined
    }
  }

  async function handleSubmit(values: WelcomeOnboardingInput) {
    try {
      const normalizedDocument = stripCpfCnpj(values.documentNumber)
      let resolvedCompanyLookupData = values.companyLookupData

      if (values.identityType === 'pessoa_juridica') {
        const hasMatchingLookup =
          resolvedCompanyLookupData &&
          stripCpfCnpj(resolvedCompanyLookupData.cnpj) === normalizedDocument

        if (!hasMatchingLookup) {
          resolvedCompanyLookupData = await resolveCompanyLookupData(normalizedDocument)
        }
      } else {
        form.setValue('companyLookupData', undefined)
        setLookupFeedback(null)
      }

      const payload = (await apiFetch('/api/v1/onboarding/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: values.organizationName,
          identityType: values.identityType,
          documentNumber: normalizedDocument,
          ...(resolvedCompanyLookupData ? { companyLookupData: resolvedCompanyLookupData } : {}),
        } satisfies WelcomeOnboardingInput),
      })) as {
        organization: { id: string; slug: string }
        project: { id: string; slug: string }
      }

      document.cookie = `${ORGANIZATION_COOKIE}=${payload.organization.id}; path=/; max-age=31536000; SameSite=Lax`
      document.cookie = `${PROJECT_COOKIE}=${payload.project.id}; path=/; max-age=31536000; SameSite=Lax`

      try {
        await authClient.organization.setActive({
          organizationId: payload.organization.id,
        })
      } catch {
        // Cookie fallback already keeps the server context coherent.
      }

      toast.success('Conta preparada com sucesso')

      startTransition(() => {
        router.replace(`/${payload.organization.slug}/${payload.project.slug}`)
        router.refresh()
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar o trial')
    }
  }

  const isSubmitting = form.formState.isSubmitting || isRefreshing
  const canSubmit =
    !!form.watch('organizationName')?.trim() &&
    !!identityType &&
    !!form.watch('documentNumber')?.trim()

  return (
    <form className="flex flex-col space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
      <Field data-invalid={!!form.formState.errors.organizationName}>
        <FieldLabel htmlFor="welcome-organization-name">Nome da organização</FieldLabel>
        <Input
          id="welcome-organization-name"
          {...form.register('organizationName')}
          disabled={isSubmitting}
          placeholder="Nome da sua organização"
          className="focus-visible:ring-primary focus-visible:border-primary h-12 px-4 shadow-sm"
        />
        <FieldError errors={[form.formState.errors.organizationName]} />
      </Field>

      <Separator />

      <Field data-invalid={!!form.formState.errors.identityType}>
        <FieldLabel>Tipo fiscal</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: 'pessoa_juridica', label: 'Pessoa Jurídica', icon: Building2 },
              { value: 'pessoa_fisica', label: 'Pessoa Física', icon: User },
            ] as const
          ).map(({ value, label, icon: Icon }) => {
            const selected = identityType === value
            return (
              <button
                key={value}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  form.setValue('identityType', value, { shouldDirty: true, shouldValidate: true })
                  form.setValue('documentNumber', '', { shouldDirty: true })
                  form.setValue('companyLookupData', undefined, { shouldDirty: true })
                  setLookupFeedback(null)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 border px-4 py-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                  selected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', selected ? 'text-primary' : 'text-muted-foreground')} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
        <FieldError errors={[form.formState.errors.identityType]} />
      </Field>

      {identityType && (
        <>
          <Field data-invalid={!!form.formState.errors.documentNumber && form.formState.isSubmitted}>
            <FieldLabel htmlFor="welcome-document-number">{documentLabel}</FieldLabel>
            <Input
              id="welcome-document-number"
              value={form.watch('documentNumber') ?? ''}
              disabled={isSubmitting}
              placeholder={documentPlaceholder}
              className="focus-visible:ring-primary focus-visible:border-primary h-12 px-4 shadow-sm"
              onChange={(event) => {
                const maskedValue = applyCpfCnpjMask(event.target.value, documentType)
                form.setValue('documentNumber', maskedValue, {
                  shouldDirty: true,
                  shouldValidate: false,
                })
                form.setValue('companyLookupData', undefined, { shouldDirty: true })
                setLookupFeedback(null)
              }}
            />
            {form.formState.isSubmitted && (
              <FieldError errors={[form.formState.errors.documentNumber]} />
            )}
          </Field>

          {lookupFeedback && (
            <Alert variant={lookupFeedback.kind === 'fallback' ? 'destructive' : 'default'}>
              {lookupFeedback.kind === 'fallback' ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <CircleCheckBig className="h-4 w-4" />
              )}
              <AlertTitle>{lookupFeedback.title}</AlertTitle>
              <AlertDescription>
                {lookupFeedback.description}
                {lookupFeedback.kind === 'success' && companySummary ? ` ${companySummary}.` : ''}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className="shadow-primary/20 mt-2 h-12 w-full text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5"
      >
        {isSubmitting ? 'Preparando sua conta...' : 'Salvar e entrar'}
      </Button>
    </form>
  )
}
