'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuthorization } from '@/hooks/auth/use-authorization'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useOrganization } from '@/hooks/organization/use-organization'
import type { SubscriptionResponse } from '@/schemas/billing/billing-schemas'
import type { UpdateMeAccountInput } from '@/schemas/me/me-account-schemas'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { OnboardingDialog } from '@/components/dashboard/organization/onboarding-dialog'
import { AccountProfileCard, type AccountProfile } from './account-profile-card'
import { AccountOrganizationCard, type AccountOrganization } from './account-organization-card'
import { AccountBillingCard } from './account-billing-card'
import { apiFetch } from '@/lib/api-client'

async function fetchJson<T>(url: string, init?: RequestInit & { orgId?: string }): Promise<T> {
  return apiFetch(url, init)
}


export function MyAccountContent() {
  const { data: org } = useOrganization()
  const organizationId = org?.id
  const queryClient = useQueryClient()
  const authorization = useAuthorization()
  const { subscription, isLoading: billingLoading } = useBillingSubscription()

  const { data: account } = useQuery({
    queryKey: ['me', 'account'],
    queryFn: () => fetchJson<AccountProfile>('/api/v1/me/account'),
  })

  const { data: organization } = useQuery({
    queryKey: ['organizations', 'me', organizationId],
    queryFn: () => fetchJson<AccountOrganization>('/api/v1/organizations/me', {
      orgId: organizationId,
    }),
    enabled: !!organizationId,
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isFiscalDialogOpen, setIsFiscalDialogOpen] = useState(false)

  const canManageOrganizationSettings = authorization.isOwner

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateMeAccountInput) =>
      fetchJson<AccountProfile>('/api/v1/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
        }),
      }),
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['me', 'account'] })
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
            (error as any).code,
            (error as any).message || 'Não foi possível alterar sua senha.'
          )
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

      {organization ? (
        <>
          <AccountOrganizationCard
            organization={organization}
            canManageOrganizationSettings={canManageOrganizationSettings}
            onEdit={() => setIsFiscalDialogOpen(true)}
          />

          {isFiscalDialogOpen ? (
            <OnboardingDialog
              key={`${organization.id}:${organization.updatedAt}:${organization.documentNumber ?? ''}`}
              open={isFiscalDialogOpen}
              mode="edit"
              initialOrganization={organization}
              onOpenChange={setIsFiscalDialogOpen}
            />
          ) : null}
        </>
      ) : null}

      <AccountBillingCard
        subscription={subscription as SubscriptionResponse | null}
        isLoading={billingLoading}
      />
    </div>
  )
}
