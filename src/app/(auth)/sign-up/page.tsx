'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/auth-client'
import { signUpSchema, type SignUpData } from '@/schemas/sign-up'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function SignUpPage() {
  const router = useRouter()

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
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
        const errorMessage = getAuthErrorMessage(
          (signUpError as any)?.code,
          (signUpError as any)?.message || 'Não foi possível criar sua conta.'
        )
        toast.error(errorMessage)
        return
      }

      if (!signUpData) {
        toast.error('Falha ao criar conta. Tente novamente.')
        return
      }

      // 2. Aguardar sincronização da session
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 3. Criar organização vazia
      try {
        const orgResponse = await fetch('/api/v1/organizations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            onboardingCompleted: false,
          }),
        })

        if (!orgResponse.ok) {
          console.error('[sign-up] Failed to create organization')
        }
      } catch (orgError) {
        console.error('[sign-up] Error creating organization:', orgError)
      }

      // 4. Atualizar phone do usuário
      if (values.phone) {
        try {
          await fetch('/api/v1/users/me', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: values.phone.replace(/\D/g, '') }),
          })
        } catch (phoneError) {
          console.error('[sign-up] Error updating phone:', phoneError)
        }
      }

      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
    } catch (error) {
      console.error('[sign-up] erro ao criar conta', error)
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12" data-testid="sign-up-page">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/images/logo_transparent.png" alt="WhaTrack" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece a rastrear seus leads em minutos
          </p>
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
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
                    disabled={isSubmitting}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>WhatsApp Pessoal</FieldLabel>
                  <Input
                    id={field.name}
                    type="tel"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
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
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
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
                    disabled={isSubmitting}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  )
}
