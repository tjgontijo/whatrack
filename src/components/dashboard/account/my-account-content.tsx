'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { isOwner } from '@/lib/auth/rbac/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { UpdateMeAccountInput } from '@/schemas/me/me-account-schemas'
import type { AccountSummary } from '@/types/account/account-summary'
import { OnboardingDialog } from '@/components/dashboard/organization/onboarding-dialog'
import { AccountProfileCard } from './account-profile-card'
import { AccountOrganizationCard } from './account-organization-card'
import { AccountBillingCard } from './account-billing-card'
import { apiFetch } from '@/lib/api-client'

async function fetchJson<T>(url: string, init?: RequestInit & { orgId?: string }): Promise<T> {
  return apiFetch(url, init)
}

type MyAccountContentProps = {
  initialAccount: AccountSummary['account']
  initialOrganization: AccountSummary['organization']
  initialSubscription: AccountSummary['subscription']
}

export function MyAccountContent({
  initialAccount,
  initialOrganization,
  initialSubscription,
}: MyAccountContentProps) {
  const router = useRouter()
  const [account, setAccount] = useState(initialAccount)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isFiscalDialogOpen, setIsFiscalDialogOpen] = useState(false)

  const canManageOrganizationSettings = isOwner(initialOrganization?.currentUserRole)

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateMeAccountInput) =>
      fetchJson<typeof initialAccount>('/api/v1/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedAccount) => {
      setAccount(updatedAccount)
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
      {account ? (
        <AccountProfileCard
          key={`${account.id}:${account.updatedAt}`}
          account={account}
          isPending={updateProfileMutation.isPending}
          onSubmit={(data) => updateProfileMutation.mutate(data)}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Atualize a senha de acesso da sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Senha atual</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nova senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Confirmar nova senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <div>
            <Button
              onClick={() => updatePasswordMutation.mutate()}
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {initialOrganization ? (
        <>
          <AccountOrganizationCard
            organization={initialOrganization}
            canManageOrganizationSettings={canManageOrganizationSettings}
            onEdit={() => setIsFiscalDialogOpen(true)}
          />

          {isFiscalDialogOpen ? (
            <OnboardingDialog
              key={`${initialOrganization.id}:${initialOrganization.updatedAt}:${initialOrganization.documentNumber ?? ''}`}
              open={isFiscalDialogOpen}
              mode="edit"
              initialOrganization={initialOrganization}
              onOpenChange={setIsFiscalDialogOpen}
              onCompleted={() => {
                startTransition(() => {
                  router.refresh()
                })
              }}
            />
          ) : null}
        </>
      ) : null}

      <AccountBillingCard subscription={initialSubscription} />
    </div>
  )
}
