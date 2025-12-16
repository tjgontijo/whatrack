"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Senha</FormLabel>                   
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Sua senha"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-end">
                   <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                    </div>
                  <FormMessage />
                </FormItem>
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
