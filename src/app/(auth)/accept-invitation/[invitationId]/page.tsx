'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import {
  acceptOrganizationInvitation,
  buildInvitationQuery,
  fetchInvitationPreview,
} from '@/lib/auth/invitation-client'

const invitationSignUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome completo.'),
    password: z
      .string()
      .min(1, 'Informe sua senha.')
      .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z
      .string()
      .min(1, 'Confirme sua senha.')
      .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })

type InvitationSignUpData = z.infer<typeof invitationSignUpSchema>

export default function AcceptInvitationPage() {
  const router = useRouter()
  const params = useParams<{ invitationId: string }>()

  const invitationId = useMemo(() => {
    const raw = params?.invitationId
    if (Array.isArray(raw)) {
      return raw[0] || ''
    }
    return raw || ''
  }, [params])

  const invitationQuery = useMemo(
    () => buildInvitationQuery(invitationId || null),
    [invitationId]
  )

  const form = useForm<InvitationSignUpData>({
    resolver: zodResolver(invitationSignUpSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  })

  const invitationQueryResult = useQuery({
    queryKey: ['auth', 'invitation', { invitationId }],
    queryFn: () => fetchInvitationPreview(invitationId),
    enabled: invitationId.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const invitation = invitationQueryResult.data

  const handleSubmit = async (values: InvitationSignUpData) => {
    if (!invitation) {
      toast.error('Convite inválido ou expirado.')
      return
    }

    try {
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: invitation.email,
        password: values.password,
        name: values.name,
      })

      if (signUpError) {
        const code = (signUpError as any)?.code as string | undefined

        if (code === 'USER_ALREADY_EXISTS') {
          toast.error('Este e-mail já possui conta. Faça login para aceitar o convite.')
          router.push(`/sign-in${invitationQuery}`)
          return
        }

        const errorMessage = getAuthErrorMessage(
          code,
          (signUpError as any)?.message || 'Não foi possível criar sua conta.'
        )
        toast.error(errorMessage)
        return
      }

      if (!signUpData) {
        toast.error('Falha ao criar conta. Tente novamente.')
        return
      }

      await acceptOrganizationInvitation(invitationId)

      toast.success('Conta criada e convite aceito com sucesso!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Falha na comunicação com o servidor. Tente novamente.'
      )
    }
  }

  const isSubmitting = form.formState.isSubmitting

  if (invitationQueryResult.isLoading) {
    return (
      <div className="w-full space-y-4">
        <h1 className="text-foreground text-2xl font-bold">Validando convite...</h1>
        <p className="text-muted-foreground text-sm">Aguarde enquanto carregamos os dados do convite.</p>
      </div>
    )
  }

  if (!invitationId || invitationQueryResult.isError || !invitation) {
    return (
      <div className="w-full space-y-6">
        <div className="text-left">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Convite inválido</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            {invitationQueryResult.error instanceof Error
              ? invitationQueryResult.error.message
              : 'Convite não encontrado ou expirado.'}
          </p>
        </div>
        <Button className="w-full" asChild>
          <Link href="/sign-in">Ir para login</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-6 duration-500 lg:space-y-8">
      <div className="text-left">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Aceitar convite</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Você foi convidado para <strong>{invitation.organizationName}</strong>
        </p>
      </div>

      <Form {...form}>
        <form
          className="flex flex-col space-y-4 pt-2 lg:space-y-5"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="invitation-email">Email do convite</FieldLabel>
            <Input id="invitation-email" value={invitation.email} disabled readOnly />
          </Field>

          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nome completo</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Seu nome completo"
                  autoComplete="name"
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
            {isSubmitting ? 'Criando conta...' : 'Aceitar convite e criar conta'}
          </Button>
        </form>
      </Form>

      <div className="text-muted-foreground border-border/50 border-t pt-2 text-center text-sm lg:pt-4">
        Já possui conta?{' '}
        <Link
          href={`/sign-in${invitationQuery}`}
          className="text-foreground hover:text-primary font-bold tracking-wide transition-colors hover:underline"
        >
          Fazer login para aceitar convite
        </Link>
      </div>
    </div>
  )
}
