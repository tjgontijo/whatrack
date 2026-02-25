'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuthorization } from '@/hooks/auth/use-authorization'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Account = {
  id: string
  name: string
  email: string
  phone: string | null
}

type Team = {
  id: string
  name: string
  teamType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Erro inesperado')
  }

  return response.json() as Promise<T>
}

export function MyAccountContent() {
  const queryClient = useQueryClient()
  const authorization = useAuthorization()

  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profilePhone, setProfilePhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [teamName, setTeamName] = useState('')
  const [teamType, setTeamType] = useState<'pessoa_fisica' | 'pessoa_juridica' | ''>('')
  const [documentNumber, setDocumentNumber] = useState('')

  const { data: account } = useQuery({
    queryKey: ['me', 'account'],
    queryFn: () => fetchJson<Account>('/api/v1/me/account'),
  })

  const { data: team } = useQuery({
    queryKey: ['organizations', 'me'],
    queryFn: () => fetchJson<Team>('/api/v1/organizations/me'),
  })

  useEffect(() => {
    if (!account) return
    setProfileName(account.name || '')
    setProfileEmail(account.email || '')
    setProfilePhone(account.phone || '')
  }, [account])

  useEffect(() => {
    if (!team) return
    setTeamName(team.name || '')
    setTeamType(team.teamType || '')
    setDocumentNumber(applyCpfCnpjMask(team.documentNumber || '', team.documentType))
  }, [team])

  const canManageTeamSettings = authorization.isOwner

  const selectedDocumentType = useMemo(() => {
    if (teamType === 'pessoa_fisica') return 'cpf'
    if (teamType === 'pessoa_juridica') return 'cnpj'
    return null
  }, [teamType])

  const documentInputMaxLength = selectedDocumentType === 'cnpj' ? 18 : 14

  const accountNameLabel = useMemo(() => {
    if (teamType === 'pessoa_fisica') return 'Nome completo'
    if (teamType === 'pessoa_juridica') return 'Razão social / Nome fantasia'
    return 'Nome da conta'
  }, [teamType])

  const documentLabel = useMemo(() => {
    if (teamType === 'pessoa_fisica') return 'CPF'
    if (teamType === 'pessoa_juridica') return 'CNPJ'
    return 'Documento'
  }, [teamType])

  const documentPlaceholder = useMemo(() => {
    if (teamType === 'pessoa_juridica') return 'Informe o CNPJ'
    if (teamType === 'pessoa_fisica') return 'Informe o CPF'
    return 'Selecione PF ou PJ para informar o documento'
  }, [teamType])

  const updateProfileMutation = useMutation({
    mutationFn: async () =>
      fetchJson<Account>('/api/v1/me/account', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone || null,
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

  const updateTeamMutation = useMutation({
    mutationFn: async () =>
      fetchJson<Team>('/api/v1/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: teamName,
          teamType: teamType || null,
          documentType: selectedDocumentType,
          documentNumber: documentNumber ? stripCpfCnpj(documentNumber) : null,
        }),
      }),
    onSuccess: () => {
      toast.success('Organização atualizada com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize os dados da sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">E-mail</label>
            <Input
              type="email"
              value={profileEmail}
              onChange={(event) => setProfileEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} />
          </div>
          <div>
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da conta</CardTitle>
          <CardDescription>
            Selecione PF ou PJ e preencha os dados do documento conforme o tipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{accountNameLabel}</label>
            <Input value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          </div>

          <div className="grid gap-2 md:w-[320px]">
            <label className="text-sm font-medium">Tipo da conta</label>
            <Select
              value={teamType}
              onValueChange={(value: 'pessoa_fisica' | 'pessoa_juridica') => {
                if (value !== teamType) {
                  setDocumentNumber('')
                }
                setTeamType(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {teamType ? (
            <div className="grid gap-2 md:w-[420px]">
              <label className="text-sm font-medium">{documentLabel}</label>
              <Input
                value={documentNumber}
                maxLength={documentInputMaxLength}
                placeholder={documentPlaceholder}
                onChange={(event) =>
                  setDocumentNumber(applyCpfCnpjMask(event.target.value, selectedDocumentType))
                }
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Selecione o tipo da conta para preencher o documento.
            </p>
          )}

          <div>
            <Button
              onClick={() => updateTeamMutation.mutate()}
              disabled={!canManageTeamSettings || updateTeamMutation.isPending}
            >
              {updateTeamMutation.isPending ? 'Salvando...' : 'Salvar detalhes da conta'}
            </Button>
            {!canManageTeamSettings && (
              <p className="text-muted-foreground mt-2 text-xs">
                Somente owner pode alterar os detalhes estruturais da conta.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
