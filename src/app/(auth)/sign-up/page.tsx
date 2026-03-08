'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/auth-client'
import { signUpSchema, type SignUpData } from '@/schemas/auth/sign-up'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { acceptOrganizationInvitation, buildInvitationQuery } from '@/lib/auth/invitation-client'
import { resolveInternalPath } from '@/lib/utils/internal-path'

type SignUpErrorShape = {
  code?: string
  message?: string
}

function normalizeSignUpError(error: unknown): SignUpErrorShape {
  if (!error || typeof error !== 'object') {
    return {}
  }

  const candidate = error as { code?: unknown; message?: unknown }
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
  }
}

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitationId')
  const nextParam = searchParams.get('next')
  const invitationQuery = useMemo(
    () => buildInvitationQuery(invitationId, nextParam),
    [invitationId, nextParam]
  )
  const nextPath = resolveInternalPath(nextParam, '/dashboard')

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleSubmit = async (values: SignUpData) => {
    try {
      // 1. Criar usuário com Better Auth
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      })

      if (signUpError) {
        const normalizedSignUpError = normalizeSignUpError(signUpError)
        const errorMessage = getAuthErrorMessage(
          normalizedSignUpError.code,
          normalizedSignUpError.message || 'Não foi possível criar sua conta.'
        )
        toast.error(errorMessage)
        return
      }

      if (!signUpData) {
        toast.error('Falha ao criar conta. Tente novamente.')
        return
      }

      // 2. Aceitar convite se houver

      if (invitationId) {
        try {
          await acceptOrganizationInvitation(invitationId)
          toast.success('Conta criada e convite aceito com sucesso!')
        } catch (acceptError) {
          console.error('[sign-up] erro ao aceitar convite', acceptError)
          toast.error('Conta criada, mas não foi possível aceitar o convite.')
        }
      } else {
        toast.success('Conta criada com sucesso!')
      }

      router.push(nextPath)
    } catch (error) {
      console.error('[sign-up] erro ao criar conta', error)
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-6 duration-500 lg:space-y-8"
      data-testid="sign-up-page"
    >
      <div className="text-left">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Crie sua conta</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Comece a rastrear seus leads em minutos
        </p>
      </div>

      <Form {...form}>
        <form
          className="flex flex-col space-y-4 pt-2 lg:space-y-5"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nome completo</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  type="email"
                  placeholder="seu@empresa.com"
                  autoComplete="email"
                  className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    placeholder="Mín. 8 caracteres"
                    autoComplete="new-password"
                    className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Confirmar senha</FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Button
            type="submit"
            className="shadow-primary/20 mt-6 h-12 w-full text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 lg:mt-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta gratuitamente'}
          </Button>
        </form>
      </Form>

      <div className="text-muted-foreground border-border/50 border-t pt-2 text-center text-sm lg:pt-4">
        Já tem uma conta?{' '}
        <Link
          href={`/sign-in${invitationQuery}`}
          className="text-foreground hover:text-primary font-bold tracking-wide transition-colors hover:underline"
        >
          Fazer login
        </Link>
      </div>
    </div>
  )
}
