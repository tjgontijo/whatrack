"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"

import { FormProvider as Form, Controller } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"
import { getAuthErrorMessage } from "@/lib/auth/error-messages"

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o seu email.")
    .email("Email inválido."),
  password: z
    .string()
    .min(1, "Informe a sua senha.")
    .min(8, "A senha deve ter pelo menos 8 caracteres."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })

      if (error) {
        const errorMessage = getAuthErrorMessage(
          (error as any)?.code,
          (error as any)?.message || "Não foi possível acessar sua conta."
        )
        toast.error(errorMessage)
        return
      }

      if (data) {
        toast.success("Login realizado com sucesso!")
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("[login] erro ao autenticar", error)
      toast.error("Falha na comunicação com o servidor. Tente novamente.")
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12" data-testid="sign-in-page">
      <div className="w-full max-w-md space-y-8" data-testid="sign-in-form">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Acesse sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com seu email e senha para continuar
          </p>
        </div>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@empresa.com"
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
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                  </div>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <div className="flex items-center justify-end pt-1">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Criar conta gratuita
          </Link>
        </div>
      </div>
    </div>
  )
}
