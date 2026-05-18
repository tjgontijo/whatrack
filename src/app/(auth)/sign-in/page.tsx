'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { Controller, FormProvider as Form, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api-client'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { acceptOrganizationInvitation, buildInvitationQuery } from '@/lib/auth/invitation-client'
import {
  buildFunnelQueryString,
  readFunnelIntent,
  resolvePostAuthPath,
} from '@/lib/funnel/funnel-intent'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o seu email.').email('Email inválido.'),
  password: z
    .string()
    .min(1, 'Informe a sua senha.')
    .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginErrorShape = {
  code?: string
  message?: string
}

function normalizeLoginError(error: unknown): LoginErrorShape {
  if (!error || typeof error !== 'object') {
    return {}
  }

  const candidate = error as { code?: unknown; message?: unknown }

  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
  }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitationId')
  const nextParam = searchParams.get('next')
  const funnelIntent = readFunnelIntent(searchParams)
  const invitationQuery = useMemo(
    () => buildInvitationQuery(invitationId, nextParam),
    [invitationId, nextParam]
  )
  const funnelQuery = useMemo(() => buildFunnelQueryString(funnelIntent), [funnelIntent])
  const nextPath = resolvePostAuthPath(nextParam, funnelIntent)
  const postAuthResolutionQuery = useMemo(() => {
    const params = new URLSearchParams()

    if (nextParam?.trim()) {
      params.set('next', nextParam)
    }

    for (const [key, value] of Object.entries(funnelIntent)) {
      if (value?.trim()) {
        params.set(key, value)
      }
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  }, [funnelIntent, nextParam])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })

      if (error) {
        const normalizedError = normalizeLoginError(error)
        const errorMessage = getAuthErrorMessage(
          normalizedError.code,
          normalizedError.message || 'Não foi possível acessar sua conta.'
        )
        toast.error(errorMessage)
        return
      }

      if (data) {
        if (invitationId) {
          try {
            await acceptOrganizationInvitation(invitationId)
            toast.success('Login realizado e convite aceito com sucesso!')
          } catch (acceptError) {
            console.error('[login] erro ao aceitar convite', acceptError)
            toast.error('Login realizado, mas não foi possível aceitar o convite.')
          }
        } else {
          toast.success('Login realizado com sucesso!')
        }

        let destination = nextPath

        try {
          const response = (await apiFetch(
            `/api/v1/auth/post-auth-path${postAuthResolutionQuery}`
          )) as {
            path?: string
          }

          if (response.path) {
            destination = response.path
          }
        } catch (postAuthError) {
          console.error('[login] erro ao resolver destino pós-auth', postAuthError)
        }

        router.replace(destination)
      }
    } catch (error) {
      console.error('[login] erro ao autenticar', error)
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div
      className='fade-in slide-in-from-bottom-4 w-full animate-in space-y-8 duration-500'
      data-testid='sign-in-page'
    >
      <div className='text-left'>
        <h1 className='font-bold text-3xl text-foreground tracking-tight'>Acesse sua conta</h1>
      </div>

      <Form {...form}>
        <form className='flex flex-col space-y-5 pt-4' onSubmit={form.handleSubmit(handleSubmit)}>
          <Controller
            control={form.control}
            name='email'
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                <Input
                  id={field.name}
                  type='email'
                  inputMode='email'
                  autoComplete='email'
                  placeholder='voce@empresa.com'
                  className='h-12 px-4 shadow-sm transition-shadow focus-visible:border-primary focus-visible:ring-primary'
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name='password'
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                <Input
                  id={field.name}
                  type='password'
                  autoComplete='current-password'
                  placeholder='Sua senha secreta'
                  className='h-12 px-4 shadow-sm transition-shadow focus-visible:border-primary focus-visible:ring-primary'
                  disabled={isSubmitting}
                  {...field}
                />
                <div className='flex justify-end'>
                  <Link
                    href='/forgot-password'
                    className='mt-1 font-medium text-primary text-xs transition-colors hover:text-primary/80 hover:underline'
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Button
            type='submit'
            className='mt-4 h-12 w-full font-semibold text-sm shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Autenticando...' : 'Entrar na plataforma'}
          </Button>
        </form>
      </Form>

      <div className='pt-4 text-center text-muted-foreground text-sm'>
        Não tem uma conta?{' '}
        <Link
          href={`/sign-up${invitationQuery}${funnelQuery ? `${invitationQuery ? '&' : '?'}${funnelQuery.slice(1)}` : ''}`}
          className='font-bold text-foreground tracking-wide transition-colors hover:text-primary hover:underline'
        >
          Começar teste grátis
        </Link>
      </div>
    </div>
  )
}
