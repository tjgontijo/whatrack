"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"
import { useState } from "react"

import { FormProvider as Form, Controller } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o seu email.")
    .email("Email inválido."),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      // Call API endpoint for password recovery
      const response = await fetch("/api/v1/auth/forget-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          redirectTo: "/reset-password",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || "Não foi possível enviar o email de recuperação.")
        return
      }

      setEmailSent(true)
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.")
    } catch (error) {
      console.error("[forgot-password] erro ao enviar email", error)
      toast.error("Falha na communication com o servidor. Tente novamente.")
    }
  }

  const isSubmitting = form.formState.isSubmitting

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Email enviado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifique sua caixa de entrada e spam
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enviamos um link de recuperação para <strong>{form.getValues("email")}</strong>.
              Clique no link para redefinir sua senha.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full"
              >
                Enviar novamente
              </Button>

              <Link href="/sign-in" className="w-full">
                <Button variant="ghost" className="w-full">
                  Voltar para login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Esqueceu sua senha?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Digite seu email para receber um link de recuperação
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar link de recuperação"}
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
