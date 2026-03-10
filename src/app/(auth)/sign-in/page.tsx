'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const invitationQuery = useMemo(() => buildInvitationQuery(invitationId, nextParam), [invitationId, nextParam])
  const funnelQuery = useMemo(() => buildFunnelQueryString(funnelIntent), [funnelIntent])
  const nextPath = resolvePostAuthPath(nextParam, funnelIntent)

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
        router.push(nextPath)
      }
    } catch (error) {
      console.error('[login] erro ao autenticar', error)
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-8 duration-500"
      data-testid="sign-in-page"
    >
      <div className="text-left">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Acesse sua conta</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Entre com seu email e senha para continuar
        </p>
      </div>

      <Form {...form}>
        <form className="flex flex-col space-y-5 pt-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email corporativo</FieldLabel>
                <Input
                  id={field.name}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com"
                  className="focus-visible:ring-primary focus-visible:border-primary h-12 px-4 shadow-sm transition-shadow"
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                <Input
                  id={field.name}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha secreta"
                  className="focus-visible:ring-primary focus-visible:border-primary h-12 px-4 shadow-sm transition-shadow"
                  disabled={isSubmitting}
                  {...field}
                />
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-primary hover:text-primary/80 mt-1 text-xs font-medium transition-colors hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Button
            type="submit"
            className="shadow-primary/20 mt-4 h-12 w-full text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Autenticando...' : 'Entrar na plataforma'}
          </Button>
        </form>
      </Form>

      <div className="text-muted-foreground pt-4 text-center text-sm">
        Não tem uma conta?{' '}
        <Link
          href={`/sign-up${invitationQuery}${funnelQuery ? `${invitationQuery ? '&' : '?'}${funnelQuery.slice(1)}` : ''}`}
          className="text-foreground hover:text-primary font-bold tracking-wide transition-colors hover:underline"
        >
          Criar conta gratuita
        </Link>
      </div>
    </div>
  )
}
