type InvitationApiError = {
  error?: string
  message?: string
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

export function buildInvitationQuery(invitationId: string | null): string {
  if (!invitationId) {
    return ''
  }
  return `?invitationId=${encodeURIComponent(invitationId)}`
}
