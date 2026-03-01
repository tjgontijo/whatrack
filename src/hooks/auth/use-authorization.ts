'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  getPermissionCandidates,
  isAdmin,
  isOwner,
} from '@/lib/auth/rbac/roles'
import type { Permission } from '@/lib/auth/rbac/roles'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


type OrganizationAccessResponse = {
  id: string
  organizationId: string
  currentUserRole: string
  currentUserPermissions?: string[]
}



async function fetchOrganizationAccess(orgId: string): Promise<OrganizationAccessResponse> {
  const data = await apiFetch('/api/v1/organizations/me', {
    orgId,
  })
  return data as OrganizationAccessResponse
}


export function useAuthorization() {
  const { data: org } = useOrganization()

  const query = useQuery({
    queryKey: ['organizations', 'me', 'authorization', org?.id],
    queryFn: () => fetchOrganizationAccess(org!.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!org?.id,
  })

  const role = query.data?.currentUserRole
  const permissionList = (query.data?.currentUserPermissions ?? []) as Permission[]

  const api = useMemo(
    () => {
      const permissions = new Set(permissionList)

      return {
        role: role ?? null,
        isOwner: isOwner(role),
        isAdmin: isAdmin(role),
        can: (permission: Permission) => {
          const candidates = getPermissionCandidates(permission)
          return candidates.some((candidate) => permissions.has(candidate))
        },
        canAny: (requiredPermissions: Permission[]) =>
          requiredPermissions.some((permission) => {
            const candidates = getPermissionCandidates(permission)
            return candidates.some((candidate) => permissions.has(candidate))
          }),
        canAll: (requiredPermissions: Permission[]) =>
          requiredPermissions.every((permission) => {
            const candidates = getPermissionCandidates(permission)
            return candidates.some((candidate) => permissions.has(candidate))
          }),
      }
    },
    [permissionList, role]
  )

  return {
    ...api,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
