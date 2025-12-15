'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/auth-client'
import { signUpSchema, type SignUpData } from '@/lib/schema/sign-up'

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
        toast.error(signUpError.message || 'Não foi possível criar sua conta.')
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome"
                      autoComplete="name"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
