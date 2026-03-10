'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { apiFetch } from '@/lib/api-client'
import {
  WHATSAPP_MASK_MAX_LENGTH,
  applyWhatsAppMask,
  removeWhatsAppMask,
} from '@/lib/mask/phone-mask'
import type { UpdateMeAccountInput } from '@/schemas/me/me-account-schemas'
import type { AccountProfileSummary } from '@/types/account/account-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsSection } from './settings-section'

type ProfileSettingsContentProps = {
  account: AccountProfileSummary
}

export function ProfileSettingsContent({ account }: ProfileSettingsContentProps) {
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [phone, setPhone] = useState(applyWhatsAppMask(account.phone ?? ''))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateMeAccountInput) =>
      apiFetch('/api/v1/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Preencha todos os campos de senha')
      }

      if (newPassword.length < 8) {
        throw new Error('A nova senha deve ter ao menos 8 caracteres')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('A confirmação da senha não confere')
      }

      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })

      if (error) {
        throw new Error(
          getAuthErrorMessage(
            (error as { code?: string; message?: string }).code,
            (error as { message?: string }).message || 'Não foi possível alterar sua senha.',
          ),
        )
      }
    },
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Perfil"
        description="Atualize seus dados pessoais usados na conta logada."
        onSave={() =>
          updateProfileMutation.mutate({
            name,
            email,
            phone: removeWhatsAppMask(phone) || null,
          })
        }
        isSaving={updateProfileMutation.isPending}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="settings-profile-name">
              Nome
            </label>
            <Input
              id="settings-profile-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="settings-profile-email">
              E-mail
            </label>
            <Input
              id="settings-profile-email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 md:max-w-sm">
          <label className="text-sm font-medium" htmlFor="settings-profile-phone">
            Telefone
          </label>
          <Input
            id="settings-profile-phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={WHATSAPP_MASK_MAX_LENGTH}
            placeholder="(11) 98888-8888"
            value={phone}
            onChange={(event) => setPhone(applyWhatsAppMask(event.target.value))}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Segurança"
        description="Altere a senha de acesso da sua conta."
      >
        <div className="grid gap-4 md:max-w-md">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="settings-current-password">
              Senha atual
            </label>
            <Input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="settings-new-password">
              Nova senha
            </label>
            <Input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="settings-confirm-password">
              Confirmar nova senha
            </label>
            <Input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => updatePasswordMutation.mutate()}
            disabled={updatePasswordMutation.isPending}
          >
            {updatePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </div>
      </SettingsSection>
    </div>
  )
}
