'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import { ORGANIZATION_COOKIE, PROJECT_COOKIE } from '@/lib/constants/http-headers'
import { welcomeOnboardingSchema, type WelcomeOnboardingInput } from '@/schemas/onboarding/welcome-onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

type WelcomeOnboardingFormProps = {
  defaultOwnerName: string
  defaultAgencyName: string
  defaultProjectName: string
}

export function WelcomeOnboardingForm({
  defaultOwnerName,
  defaultAgencyName,
  defaultProjectName,
}: WelcomeOnboardingFormProps) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const form = useForm<WelcomeOnboardingInput>({
    resolver: zodResolver(welcomeOnboardingSchema),
    defaultValues: {
      ownerName: defaultOwnerName,
      agencyName: defaultAgencyName,
      projectName: defaultProjectName,
    },
  })

  async function handleSubmit(values: WelcomeOnboardingInput) {
    try {
      const payload = (await apiFetch('/api/v1/onboarding/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })) as {
        organization: { id: string }
        project: { id: string }
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

      toast.success('Teste grátis iniciado com sucesso')

      startTransition(() => {
        router.replace('/welcome')
        router.refresh()
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar o trial')
    }
  }

  const isSubmitting = form.formState.isSubmitting || isRefreshing

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader>
        <CardTitle>Comece seu teste grátis</CardTitle>
        <CardDescription>
          Precisamos só do básico para criar sua agência, abrir o primeiro projeto e liberar 14 dias
          grátis sem cartão de crédito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <Field data-invalid={!!form.formState.errors.ownerName}>
            <FieldLabel htmlFor="welcome-owner-name">Seu nome</FieldLabel>
            <Input
              id="welcome-owner-name"
              {...form.register('ownerName')}
              disabled={isSubmitting}
              placeholder="Quem vai operar a plataforma"
            />
            <FieldError errors={[form.formState.errors.ownerName]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.agencyName}>
            <FieldLabel htmlFor="welcome-agency-name">Nome da agência</FieldLabel>
            <Input
              id="welcome-agency-name"
              {...form.register('agencyName')}
              disabled={isSubmitting}
              placeholder="Nome da sua operação"
            />
            <FieldError errors={[form.formState.errors.agencyName]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.projectName}>
            <FieldLabel htmlFor="welcome-project-name">Primeiro cliente</FieldLabel>
            <Input
              id="welcome-project-name"
              {...form.register('projectName')}
              disabled={isSubmitting}
              placeholder="Nome do primeiro projeto/cliente"
            />
            <FieldError errors={[form.formState.errors.projectName]} />
          </Field>

          <Button type="submit" disabled={isSubmitting} className="h-11">
            {isSubmitting ? 'Preparando seu workspace...' : 'Iniciar teste grátis'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
