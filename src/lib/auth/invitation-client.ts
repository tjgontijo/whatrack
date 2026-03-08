import { apiFetch } from '@/lib/api-client'
import { sanitizeInternalPath } from '@/lib/utils/internal-path'

type InvitationApiError = {
  error?: string
  message?: string
}

export interface InvitationPreview {
  id: string
  email: string
  role: string
  expiresAt: string
  organizationName: string
}

export async function acceptOrganizationInvitation(invitationId: string): Promise<void> {
  const response = await fetch('/api/v1/auth/organization/accept-invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitationId }),
  })

  if (response.ok) {
    return
  }

  const body = (await response.json().catch(() => null)) as InvitationApiError | null
  throw new Error(body?.message || body?.error || 'Não foi possível aceitar o convite.')
}

export function fetchInvitationPreview(invitationId: string): Promise<InvitationPreview> {
  return apiFetch(`/api/v1/invitations/${encodeURIComponent(invitationId)}/public`) as Promise<InvitationPreview>
}

export function buildInvitationQuery(invitationId: string | null, next?: string | null): string {
  const params = new URLSearchParams()

  if (invitationId) {
    params.set('invitationId', invitationId)
  }

  const safeNextPath = sanitizeInternalPath(next)
  if (safeNextPath) {
    params.set('next', safeNextPath)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}
