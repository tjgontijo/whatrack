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
import { Input } from '@/components/ui/input'
import { SettingsGroup } from './settings-group'
import { SettingsRow } from './settings-row'

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
      <SettingsGroup
        label="Dados da conta"
        description="Atualize suas informações pessoais usadas na conta logada."
        onSave={() =>
          updateProfileMutation.mutate({
            name,
            email,
            phone: removeWhatsAppMask(phone) || null,
          })
        }
        isSaving={updateProfileMutation.isPending}
      >
        <SettingsRow label="Nome completo" description="Nome exibido no dashboard e em registros internos.">
          <Input
            id="settings-profile-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="md:max-w-sm"
          />
        </SettingsRow>

        <SettingsRow label="E-mail" description="Usado para login e comunicações da conta.">
          <Input
            id="settings-profile-email"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="md:max-w-sm"
          />
        </SettingsRow>

        <SettingsRow label="Telefone" description="Número usado para contato e notificações operacionais.">
          <Input
            id="settings-profile-phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={WHATSAPP_MASK_MAX_LENGTH}
            placeholder="(11) 98888-8888"
            value={phone}
            onChange={(event) => setPhone(applyWhatsAppMask(event.target.value))}
            className="md:max-w-sm"
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        label="Segurança"
        description="Altere a senha de acesso da sua conta."
        onSave={() => updatePasswordMutation.mutate()}
        isSaving={updatePasswordMutation.isPending}
        saveLabel="Atualizar senha"
      >
        <SettingsRow label="Senha atual" description="Confirma sua identidade antes da alteração.">
          <Input
            id="settings-current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="md:max-w-sm"
          />
        </SettingsRow>

        <SettingsRow label="Nova senha" description="Use ao menos 8 caracteres.">
          <Input
            id="settings-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="md:max-w-sm"
          />
        </SettingsRow>

        <SettingsRow label="Confirmar senha" description="Repita a nova senha para evitar erros de digitação.">
          <Input
            id="settings-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="md:max-w-sm"
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
