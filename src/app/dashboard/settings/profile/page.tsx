'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export default function ProfilePage() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmitProfile = async (data: z.infer<typeof profileSchema>) => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch('/api/v1/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Erro ao atualizar perfil')

      toast.success('Perfil atualizado com sucesso')
    } catch {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onSubmitPassword = async (data: z.infer<typeof passwordSchema>) => {
    setIsLoadingPassword(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })

      if (error) {
        throw new Error(
          getAuthErrorMessage(
            (error as any).code,
            (error as any).message || 'Erro ao alterar senha'
          )
        )
      }

      toast.success('Senha alterada com sucesso')
      passwordForm.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha')
    } finally {
      setIsLoadingPassword(false)
    }
  }

  return (
    <div className="divide-border space-y-8 divide-y">
      {/* Profile Section */}
      <div className="grid grid-cols-1 gap-6 pt-8 first:pt-0 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-none">Informações Pessoais</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Atualize seu nome e email para a conta logada.
          </p>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                  <Controller
                    control={profileForm.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Nome completo</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="João Silva"
                          className="max-w-md"
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={profileForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          type="email"
                          placeholder="joao@empresa.com"
                          className="max-w-md"
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" disabled={isLoadingProfile}>
                      {isLoadingProfile ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Section */}
      <div className="grid grid-cols-1 gap-6 pt-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-none">Alterar Senha</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Mantenha sua conta segura com uma senha forte. Recomendamos números e símbolos.
          </p>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                  <Controller
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Senha atual</FieldLabel>
                        <Input id={field.name} type="password" className="max-w-md" {...field} />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Nova senha</FieldLabel>
                        <Input
                          id={field.name}
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          className="max-w-md"
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Confirmar nova senha</FieldLabel>
                        <Input id={field.name} type="password" className="max-w-md" {...field} />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" disabled={isLoadingPassword}>
                      {isLoadingPassword ? 'Alterando...' : 'Alterar senha'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
