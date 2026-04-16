'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { authClient } from '@/lib/auth/auth-client'
import { signUpSchema, type SignUpData } from '@/schemas/auth/sign-up'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { acceptOrganizationInvitation, buildInvitationQuery } from '@/lib/auth/invitation-client'
import { buildFunnelQueryString, readFunnelIntent } from '@/lib/funnel/funnel-intent'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'

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
  const funnelIntent = readFunnelIntent(searchParams)
  const invitationQuery = useMemo(() => buildInvitationQuery(invitationId, nextParam), [invitationId, nextParam])
  const funnelQuery = useMemo(() => buildFunnelQueryString(funnelIntent), [funnelIntent])
  const isTrialIntent = funnelIntent.intent === 'start-trial'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      documentType: null,
      documentNumber: '',
    },
  })

  const documentType = form.watch('documentType')

  const handleSubmit = async (values: SignUpData) => {
    try {
      // 1. Criar usuário
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      })

      if (signUpError) {
        const normalizedSignUpError = normalizeSignUpError(signUpError)
        const errorMessage = getAuthErrorMessage(
          normalizedSignUpError.code,
          normalizedSignUpError.message || 'Não foi possível criar sua conta.',
        )
        toast.error(errorMessage)
        return
      }

      if (!signUpData) {
        toast.error('Falha ao criar conta. Tente novamente.')
        return
      }

      // 2. Aceitar convite se houver (fluxo de convite permanece igual)
      if (invitationId) {
        try {
          await acceptOrganizationInvitation(invitationId)
          toast.success('Conta criada e convite aceito com sucesso!')
        } catch (acceptError) {
          console.error('[sign-up] erro ao aceitar convite', acceptError)
          toast.error('Conta criada, mas não foi possível aceitar o convite.')
        }
        router.push(nextParam ?? '/welcome')
        return
      }

      // 3. Criar organização via setup API
      const setupRes = await fetch('/api/v1/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: values.documentType,
          documentNumber: stripCpfCnpj(values.documentNumber),
          intent: funnelIntent.intent,
        }),
      })

      if (!setupRes.ok) {
        const body = await setupRes.json().catch(() => ({}))
        toast.error(body?.message ?? 'Erro ao configurar sua conta. Tente novamente.')
        return
      }

      const nextPath = isTrialIntent ? `/welcome${funnelQuery}` : `/checkout${funnelQuery}`
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
        <h1 className="text-foreground text-3xl font-bold tracking-tight">
          {isTrialIntent ? 'Comece seu teste grátis' : 'Crie sua conta para continuar'}
        </h1>
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
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {/* Dados fiscais */}
          <Controller
            control={form.control}
            name="documentType"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Documento fiscal</FieldLabel>
                <div className="flex gap-3">
                  {(['CPF', 'CNPJ'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        field.onChange(type)
                        form.setValue('documentNumber', '')
                      }}
                      disabled={isSubmitting}
                      className={`h-11 flex-1 rounded-lg border text-sm font-medium transition-all lg:h-12 ${
                        field.value === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {documentType ? (
            <Controller
              control={form.control}
              name="documentNumber"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{documentType}</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    autoComplete="off"
                    inputMode="numeric"
                    className="focus-visible:ring-primary focus-visible:border-primary h-11 px-4 shadow-sm transition-shadow lg:h-12"
                    disabled={isSubmitting}
                    value={applyCpfCnpjMask(field.value, documentType === 'CPF' ? 'cpf' : 'cnpj')}
                    onChange={(e) => {
                      const raw = stripCpfCnpj(e.target.value)
                      const maxLen = documentType === 'CPF' ? 11 : 14
                      field.onChange(raw.slice(0, maxLen))
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : null}

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                <InputGroup className="focus-visible:ring-primary focus-visible:border-primary h-11 shadow-sm transition-shadow lg:h-12">
                  <InputGroupInput
                    id={field.name}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mín. 8 caracteres"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
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
                <InputGroup className="focus-visible:ring-primary focus-visible:border-primary h-11 shadow-sm transition-shadow lg:h-12">
                  <InputGroupInput
                    id={field.name}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Button
            type="submit"
            className="shadow-primary/20 mt-6 h-12 w-full text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 lg:mt-8"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Criando conta...'
              : isTrialIntent
                ? 'Começar teste grátis'
                : 'Continuar para pagamento'}
          </Button>
        </form>
      </Form>

      <div className="text-muted-foreground border-border/50 border-t pt-2 text-center text-sm lg:pt-4">
        Já tem uma conta?{' '}
        <Link
          href={`/sign-in${invitationQuery}${funnelQuery ? `${invitationQuery ? '&' : '?'}${funnelQuery.slice(1)}` : ''}`}
          className="text-foreground hover:text-primary font-bold tracking-wide transition-colors hover:underline"
        >
          Entrar na plataforma
        </Link>
      </div>
    </div>
  )
}
