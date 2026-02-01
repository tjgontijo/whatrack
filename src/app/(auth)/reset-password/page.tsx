"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"
import { Suspense } from "react"

import { FormProvider as Form, Controller } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Informe a sua nova senha.")
    .min(8, "A senha deve ter pelo menos 8 caracteres."),
  confirmPassword: z
    .string()
    .min(1, "Confirme a sua nova senha."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Token de recuperação inválido ou ausente.")
      return
    }

    try {
      // Call API endpoint for password reset
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || "Não foi possível redefinir sua senha.")
        return
      }

      toast.success("Senha redefinida com sucesso!")
      router.push("/sign-in")
    } catch (error) {
      console.error("[reset-password] erro ao redefinir senha", error)
      toast.error("Falha na comunicação com o servidor. Tente novamente.")
    }
  }

  const isSubmitting = form.formState.isSubmitting

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Link inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O link de recuperação está ausente ou expirado
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              O link de recuperação de senha é inválido ou expirou.
              Por favor, solicite um novo link de recuperação.
            </p>

            <Link href="/forgot-password" className="w-full block">
              <Button className="w-full">
                Solicitar novo link
              </Button>
            </Link>

            <Link href="/sign-in" className="w-full block">
              <Button variant="ghost" className="w-full">
                Voltar para login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </div>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nova senha</FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
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
                    autoComplete="new-password"
                    placeholder="Digite novamente"
                    disabled={isSubmitting}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Redefinindo…" : "Redefinir senha"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          Lembrou sua senha?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Voltar para login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
