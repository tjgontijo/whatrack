'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getPermissionLabel, getPlatformPermissions } from '@/lib/auth/rbac/roles'
import { useAuthorization } from '@/hooks/auth/use-authorization'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Account = {
  id: string
}

type TeamMember = {
  id: string
  userId: string
  role: string
  name: string
  email: string
}

type TeamInvitation = {
  id: string
  email: string
  role: string | null
  expiresAt: string
}

type OrganizationRole = {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
}

type RolesResponse = {
  data: OrganizationRole[]
  permissionCatalog: string[]
}

type MemberPermissionsResponse = {
  memberId: string
  roleKey: string
  roleExists: boolean
  roleName: string | null
  allowOverrides: string[]
  denyOverrides: string[]
  effectivePermissions: string[]
  permissionCatalog: string[]
  permissions: Array<{
    key: string
    allowed: boolean
    source: 'role' | 'override_allow' | 'override_deny' | 'none'
  }>
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

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'owner') return 'default'
  if (role === 'admin') return 'secondary'
  return 'outline'
}

function roleLabel(role: string, roles: OrganizationRole[]) {
  const mapped = roles.find((item) => item.key === role)
  return mapped?.name || role
}

function sourceLabel(source: MemberPermissionsResponse['permissions'][number]['source']) {
  if (source === 'override_deny') return 'Override deny'
  if (source === 'override_allow') return 'Override allow'
  if (source === 'role') return 'Papel'
  return 'Sem acesso'
}

function toRoleKeyDraft(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function TeamAccessContent() {
  const queryClient = useQueryClient()
  const authorization = useAuthorization()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [overrideAllowDraft, setOverrideAllowDraft] = useState<string[]>([])
  const [overrideDenyDraft, setOverrideDenyDraft] = useState<string[]>([])

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleNameDraft, setRoleNameDraft] = useState('')
  const [roleKeyDraft, setRoleKeyDraft] = useState('')
  const [roleDescriptionDraft, setRoleDescriptionDraft] = useState('')
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState<string[]>([])

  const { data: account } = useQuery({
    queryKey: ['me', 'account'],
    queryFn: () => fetchJson<Account>('/api/v1/me/account'),
  })

  const canManageTeamOps =
    authorization.can('manage:members') && (authorization.isOwner || authorization.isAdmin)
  const canManageRoles = authorization.isOwner
  const canManageMemberPermissions = authorization.isOwner

  const membersQuery = useQuery({
    queryKey: ['organizations', 'me', 'members'],
    queryFn: () => fetchJson<{ data: TeamMember[] }>('/api/v1/organizations/me/members'),
    enabled: canManageTeamOps || canManageMemberPermissions,
  })

  const invitationsQuery = useQuery({
    queryKey: ['organizations', 'me', 'invitations'],
    queryFn: () => fetchJson<{ data: TeamInvitation[] }>('/api/v1/organizations/me/invitations'),
    enabled: canManageTeamOps,
  })

  const rolesQuery = useQuery({
    queryKey: ['organizations', 'me', 'roles'],
    queryFn: () => fetchJson<RolesResponse>('/api/v1/organizations/me/roles'),
    enabled: canManageTeamOps || canManageRoles,
  })

  const memberPermissionsQuery = useQuery({
    queryKey: ['organizations', 'me', 'members', selectedMemberId, 'permissions'],
    queryFn: () =>
      fetchJson<MemberPermissionsResponse>(
        `/api/v1/organizations/me/members/${selectedMemberId}/permissions`
      ),
    enabled: canManageMemberPermissions && Boolean(selectedMemberId),
  })

  const members = membersQuery.data?.data || []
  const invitations = invitationsQuery.data?.data || []
  const roles = rolesQuery.data?.data || []

  const roleCatalog = useMemo(
    () =>
      [...(rolesQuery.data?.permissionCatalog || getPlatformPermissions())].sort((a, b) =>
        getPermissionLabel(a).localeCompare(getPermissionLabel(b), 'pt-BR')
      ),
    [rolesQuery.data?.permissionCatalog]
  )

  useEffect(() => {
    if (!members.length) {
      setSelectedMemberId('')
      return
    }

    const exists = members.some((member) => member.id === selectedMemberId)
    if (!selectedMemberId || !exists) {
      setSelectedMemberId(members[0]?.id || '')
    }
  }, [members, selectedMemberId])

  useEffect(() => {
    const data = memberPermissionsQuery.data
    if (!data) return
    setOverrideAllowDraft(data.allowOverrides)
    setOverrideDenyDraft(data.denyOverrides)
  }, [memberPermissionsQuery.data])

  const assignableRoles = useMemo(() => {
    if (!roles.length) {
      return authorization.isOwner ? ['owner', 'admin', 'user'] : ['admin', 'user']
    }

    if (authorization.isOwner) {
      return roles.map((role) => role.key)
    }

    if (authorization.isAdmin) {
      return roles.filter((role) => ['user', 'admin'].includes(role.key)).map((role) => role.key)
    }

    return []
  }, [authorization.isAdmin, authorization.isOwner, roles])

  useEffect(() => {
    if (!assignableRoles.length) return
    if (!assignableRoles.includes(inviteRole)) {
      setInviteRole(assignableRoles[0] || 'user')
    }
  }, [assignableRoles, inviteRole])

  const selectedMember = members.find((member) => member.id === selectedMemberId) || null
  const inviteRoleOptions = assignableRoles.length > 0 ? assignableRoles : ['user']

  const createInvitationMutation = useMutation({
    mutationFn: async () =>
      fetchJson<{ id: string }>('/api/v1/organizations/me/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      }),
    onSuccess: () => {
      toast.success('Convite enviado com sucesso')
      setInviteEmail('')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'invitations'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) =>
      fetchJson(`/api/v1/organizations/me/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      toast.success('Papel atualizado com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'members'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) =>
      fetchJson(`/api/v1/organizations/me/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Membro removido com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'members'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) =>
      fetchJson(`/api/v1/organizations/me/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Convite removido')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'invitations'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) =>
      fetchJson(`/api/v1/organizations/me/invitations/${invitationId}/resend`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Convite reenviado com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'invitations'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (!roleNameDraft.trim()) {
        throw new Error('Informe um nome para o papel')
      }

      if (!editingRoleId && !toRoleKeyDraft(roleKeyDraft || roleNameDraft)) {
        throw new Error('Chave do papel inválida')
      }

      if (editingRoleId) {
        return fetchJson(`/api/v1/organizations/me/roles/${editingRoleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: roleNameDraft.trim(),
            description: roleDescriptionDraft.trim() || null,
            permissions: rolePermissionsDraft,
          }),
        })
      }

      return fetchJson('/api/v1/organizations/me/roles', {
        method: 'POST',
        body: JSON.stringify({
          key: toRoleKeyDraft(roleKeyDraft || roleNameDraft),
          name: roleNameDraft.trim(),
          description: roleDescriptionDraft.trim() || null,
          permissions: rolePermissionsDraft,
        }),
      })
    },
    onSuccess: () => {
      toast.success(editingRoleId ? 'Papel atualizado com sucesso' : 'Papel criado com sucesso')
      setEditingRoleId(null)
      setRoleNameDraft('')
      setRoleKeyDraft('')
      setRoleDescriptionDraft('')
      setRolePermissionsDraft([])
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'roles'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'members'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) =>
      fetchJson(`/api/v1/organizations/me/roles/${roleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Papel removido com sucesso')
      if (editingRoleId) {
        setEditingRoleId(null)
        setRoleNameDraft('')
        setRoleKeyDraft('')
        setRoleDescriptionDraft('')
        setRolePermissionsDraft([])
      }
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'roles'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'members'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const saveMemberOverridesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId) {
        throw new Error('Selecione um membro para editar permissões')
      }

      return fetchJson(`/api/v1/organizations/me/members/${selectedMemberId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({
          allow: overrideAllowDraft,
          deny: overrideDenyDraft,
        }),
      })
    },
    onSuccess: () => {
      toast.success('Overrides atualizados com sucesso')
      if (selectedMemberId) {
        void queryClient.invalidateQueries({
          queryKey: ['organizations', 'me', 'members', selectedMemberId, 'permissions'],
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'members'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <Tabs defaultValue="membros" className="space-y-6">
      <TabsList>
        <TabsTrigger value="membros">Membros</TabsTrigger>
        <TabsTrigger value="papeis">Papéis</TabsTrigger>
        <TabsTrigger value="permissoes">Permissões</TabsTrigger>
      </TabsList>

      <TabsContent value="membros" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>Gerencie acesso e papel base de cada membro.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      Nenhum membro encontrado.
                    </TableCell>
                  </TableRow>
                )}

                {members.map((member) => {
                  const isOwnerMember = member.role === 'owner'
                  const canChangeRole =
                    canManageTeamOps &&
                    (authorization.isOwner || !isOwnerMember) &&
                    (authorization.isOwner || member.userId !== account?.id)

                  const canRemove =
                    canManageTeamOps &&
                    member.userId !== account?.id &&
                    (authorization.isOwner
                      ? true
                      : member.role === 'user' || member.role === 'admin')

                  return (
                    <TableRow key={member.id}>
                      <TableCell>{member.name || 'Usuário sem nome'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {canChangeRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              updateMemberRoleMutation.mutate({ memberId: member.id, role: value })
                            }
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((roleKey) => (
                                <SelectItem key={roleKey} value={roleKey}>
                                  {roleLabel(roleKey, roles)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            {roleLabel(member.role, roles)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canRemove || removeMemberMutation.isPending}
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convites</CardTitle>
            <CardDescription>Envie convites para novos membros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input
                type="email"
                placeholder="email@dominio.com"
                value={inviteEmail}
                disabled={!canManageTeamOps}
                onChange={(event) => setInviteEmail(event.target.value)}
              />

              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value)}
                disabled={!canManageTeamOps}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoleOptions.map((roleKey) => (
                    <SelectItem key={roleKey} value={roleKey}>
                      {roleLabel(roleKey, roles)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                disabled={!canManageTeamOps || createInvitationMutation.isPending || !inviteEmail}
                onClick={() => createInvitationMutation.mutate()}
              >
                Enviar convite
              </Button>
            </div>

            {canManageTeamOps ? (
              <div className="space-y-2">
                {invitations.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhum convite pendente.</p>
                )}

                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col justify-between gap-3 rounded-md border p-3 md:flex-row md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="text-muted-foreground text-xs">
                        Papel: {roleLabel(invitation.role || 'user', roles)} · expira em{' '}
                        {format(new Date(invitation.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendInvitationMutation.mutate(invitation.id)}
                        disabled={resendInvitationMutation.isPending || deleteInvitationMutation.isPending}
                      >
                        Reenviar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                        disabled={deleteInvitationMutation.isPending || resendInvitationMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Apenas owner/admin podem gerenciar convites.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="papeis" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Papéis</CardTitle>
            <CardDescription>
              Owner define papéis customizados e matriz de permissões base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!canManageRoles && (
              <p className="text-muted-foreground text-sm">
                Apenas owner pode criar, editar ou remover papéis.
              </p>
            )}

            {canManageRoles && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Nome do papel</label>
                    <Input
                      value={roleNameDraft}
                      onChange={(event) => setRoleNameDraft(event.target.value)}
                      placeholder="Ex.: Operador Comercial"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Chave do papel</label>
                    <Input
                      value={roleKeyDraft}
                      disabled={Boolean(editingRoleId)}
                      onChange={(event) => setRoleKeyDraft(event.target.value)}
                      placeholder="operador_comercial"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Descrição</label>
                    <Input
                      value={roleDescriptionDraft}
                      onChange={(event) => setRoleDescriptionDraft(event.target.value)}
                      placeholder="Uso interno para área de atendimento"
                    />
                  </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissões do papel</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {roleCatalog.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={rolePermissionsDraft.includes(permission)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRolePermissionsDraft((current) =>
                                Array.from(new Set([...current, permission]))
                              )
                              return
                            }
                            setRolePermissionsDraft((current) =>
                              current.filter((item) => item !== permission)
                            )
                          }}
                        />
                        <span>{getPermissionLabel(permission)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveRoleMutation.mutate()} disabled={saveRoleMutation.isPending}>
                    {editingRoleId ? 'Salvar alterações' : 'Criar papel'}
                  </Button>
                  {editingRoleId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingRoleId(null)
                        setRoleNameDraft('')
                        setRoleKeyDraft('')
                        setRoleDescriptionDraft('')
                        setRolePermissionsDraft([])
                      }}
                    >
                      Cancelar edição
                    </Button>
                  )}
                </div>
              </>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Papel</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      Nenhum papel encontrado.
                    </TableCell>
                  </TableRow>
                )}

                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{role.name}</span>
                        {role.isSystem && <Badge variant="outline">Sistema</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{role.key}</TableCell>
                    <TableCell>{role.permissions.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canManageRoles || role.isSystem}
                          onClick={() => {
                            setEditingRoleId(role.id)
                            setRoleNameDraft(role.name)
                            setRoleKeyDraft(role.key)
                            setRoleDescriptionDraft(role.description || '')
                            setRolePermissionsDraft(role.permissions)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canManageRoles || role.isSystem || deleteRoleMutation.isPending}
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="permissoes" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Permissões por membro</CardTitle>
            <CardDescription>
              Owner define overrides por membro. `deny` sempre vence conflito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageMemberPermissions && (
              <p className="text-muted-foreground text-sm">
                Apenas owner pode alterar permissões por membro.
              </p>
            )}

            {canManageMemberPermissions && (
              <>
                <div className="grid gap-2 md:w-[360px]">
                  <label className="text-sm font-medium">Membro</label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMember && (
                  <div className="rounded-md border p-3 text-sm">
                    <p>
                      <strong>Membro:</strong> {selectedMember.name || selectedMember.email}
                    </p>
                    <p>
                      <strong>Papel base:</strong>{' '}
                      {roleLabel(memberPermissionsQuery.data?.roleKey || selectedMember.role, roles)}
                    </p>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Efetiva</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Allow</TableHead>
                      <TableHead>Deny</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!memberPermissionsQuery.data?.permissions?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground text-center">
                          Selecione um membro para visualizar permissões.
                        </TableCell>
                      </TableRow>
                    )}

                    {memberPermissionsQuery.data?.permissions.map((permission) => (
                      <TableRow key={permission.key}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{getPermissionLabel(permission.key)}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {permission.key}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={permission.allowed ? 'secondary' : 'outline'}>
                            {permission.allowed ? 'Permitido' : 'Negado'}
                          </Badge>
                        </TableCell>
                        <TableCell>{sourceLabel(permission.source)}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={overrideAllowDraft.includes(permission.key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setOverrideAllowDraft((current) =>
                                  Array.from(new Set([...current, permission.key]))
                                )
                                setOverrideDenyDraft((current) =>
                                  current.filter((item) => item !== permission.key)
                                )
                                return
                              }
                              setOverrideAllowDraft((current) =>
                                current.filter((item) => item !== permission.key)
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={overrideDenyDraft.includes(permission.key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setOverrideDenyDraft((current) =>
                                  Array.from(new Set([...current, permission.key]))
                                )
                                setOverrideAllowDraft((current) =>
                                  current.filter((item) => item !== permission.key)
                                )
                                return
                              }
                              setOverrideDenyDraft((current) =>
                                current.filter((item) => item !== permission.key)
                              )
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div>
                  <Button
                    onClick={() => saveMemberOverridesMutation.mutate()}
                    disabled={saveMemberOverridesMutation.isPending || !memberPermissionsQuery.data?.memberId}
                  >
                    {saveMemberOverridesMutation.isPending ? 'Salvando...' : 'Salvar overrides'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
