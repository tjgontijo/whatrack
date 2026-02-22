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
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="sign-in-page">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesse sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground font-medium">
          Entre com seu email e senha para continuar
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-5 flex flex-col pt-4" onSubmit={form.handleSubmit(handleSubmit)}>
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
                  className="h-12 px-4 shadow-sm transition-shadow focus-visible:ring-primary focus-visible:border-primary"
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
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <Input
                  id={field.name}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha secreta"
                  className="h-12 px-4 shadow-sm transition-shadow focus-visible:ring-primary focus-visible:border-primary"
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Button type="submit" className="w-full h-12 mt-4 font-semibold text-sm shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5" disabled={isSubmitting}>
            {isSubmitting ? "Autenticando..." : "Entrar na plataforma"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground pt-4">
        Não tem uma conta?{" "}
        <Link href="/sign-up" className="font-bold tracking-wide text-foreground hover:text-primary transition-colors hover:underline">
          Criar conta gratuita
        </Link>
      </div>
    </div>
  )
}
