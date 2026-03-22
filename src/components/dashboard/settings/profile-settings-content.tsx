'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { apiFetch } from '@/lib/api-client'
import {
  WHATSAPP_MASK_MAX_LENGTH,
  applyWhatsAppMask,
  removeWhatsAppMask,
} from '@/lib/mask/phone-mask'
import { cn } from '@/lib/utils/utils'
import type { UpdateMeAccountInput } from '@/schemas/me/me-account-schemas'
import type { AccountProfileSummary } from '@/types/account/account-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ProfileSettingsContentProps = {
  account: AccountProfileSummary
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

type ProfileField = { label: string; value: string; placeholder?: string }

function InfoRow({
  label,
  value,
  editing,
  placeholder,
  inputId,
  inputProps,
}: {
  label: string
  value: string
  editing: boolean
  placeholder?: string
  inputId: string
  inputProps?: React.ComponentProps<'input'>
}) {
  return (
    <div className="border-border flex items-center gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground w-24 shrink-0 text-xs font-medium uppercase tracking-wide">
        {label}
      </span>
      {editing ? (
        <Input
          id={inputId}
          defaultValue={value}
          placeholder={placeholder}
          className="h-8 max-w-sm text-sm"
          {...inputProps}
        />
      ) : (
        <span className={cn('text-sm', !value && 'text-muted-foreground italic')}>
          {value || placeholder || '—'}
        </span>
      )}
    </div>
  )
}

export function ProfileSettingsContent({ account }: ProfileSettingsContentProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [phone, setPhone] = useState(applyWhatsAppMask(account.phone ?? ''))
  const [showPassword, setShowPassword] = useState(false)
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
      toast.success('Perfil atualizado')
      setEditing(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error('A nova senha deve ter ao menos 8 caracteres')
      if (newPassword !== confirmPassword) throw new Error('As senhas não conferem')
      const { error } = await authClient.changePassword({ currentPassword, newPassword })
      if (error) {
        throw new Error(
          getAuthErrorMessage(
            (error as { code?: string }).code,
            (error as { message?: string }).message || 'Não foi possível alterar sua senha.',
          ),
        )
      }
    },
    onSuccess: () => {
      toast.success('Senha atualizada')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="flex h-full items-start justify-center">
      <div className="w-full max-w-lg space-y-8">

        {/* Avatar + identidade */}
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
            {getInitials(account.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{account.name}</p>
            <p className="text-muted-foreground truncate text-sm">{account.email}</p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-xs transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
        </div>

        {/* Dados */}
        <div>
          <InfoRow
            label="Nome"
            value={name}
            editing={editing}
            inputId="settings-profile-name"
            inputProps={{ autoComplete: 'name', onChange: (e) => setName(e.target.value) }}
          />
          <InfoRow
            label="E-mail"
            value={email}
            editing={editing}
            inputId="settings-profile-email"
            inputProps={{ type: 'email', autoComplete: 'email', onChange: (e) => setEmail(e.target.value) }}
          />
          <InfoRow
            label="Telefone"
            value={phone}
            editing={editing}
            placeholder="(11) 98888-8888"
            inputId="settings-profile-phone"
            inputProps={{
              autoComplete: 'tel',
              inputMode: 'tel',
              maxLength: WHATSAPP_MASK_MAX_LENGTH,
              onChange: (e) => setPhone(applyWhatsAppMask(e.target.value)),
            }}
          />
        </div>

        {/* Ações do perfil */}
        {editing && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false)
                setName(account.name)
                setEmail(account.email)
                setPhone(applyWhatsAppMask(account.phone ?? ''))
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateProfileMutation.mutate({
                  name,
                  email,
                  phone: removeWhatsAppMask(phone) || null,
                })
              }
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}

        {/* Senha */}
        {!showPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(true)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Alterar senha</p>

            <div className="grid gap-1.5">
              <Label htmlFor="settings-current-password">Senha atual</Label>
              <Input id="settings-current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="max-w-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="settings-new-password">Nova senha</Label>
              <Input id="settings-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="max-w-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="settings-confirm-password">Confirmar</Label>
              <Input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="max-w-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => { setShowPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => updatePasswordMutation.mutate()}
                disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              >
                {updatePasswordMutation.isPending ? 'Salvando...' : 'Atualizar senha'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
