import 'server-only'

import { headers, cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { ORGANIZATION_HEADER, ORGANIZATION_COOKIE } from '@/lib/constants'

/**
 * Resolve a organização ativa do usuário com prioridade:
 * 1. Header `x-organization-id` (APIs/client explícito)
 * 2. Cookie `x-organization-id` (navegação/UI)
 * 3. Primeira organização do usuário (fallback server)
 *
 * Retorna null se o usuário não pertence a nenhuma organização.
 */
export async function getCurrentOrganizationId(userId: string): Promise<string | null> {
  try {
    const h = await headers()
    const c = await cookies()

    // Prioridade 1: Header (APIs)
    const fromHeader = h.get(ORGANIZATION_HEADER)?.trim()
    if (fromHeader) {
      return fromHeader
    }

    // Prioridade 2: Cookie (navegação)
    const fromCookie = c.get(ORGANIZATION_COOKIE)?.value?.trim()
    if (fromCookie) {
      return fromCookie
    }

    // Prioridade 3: Primeira organização do usuário
    const membership = await prisma.member.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    })

    return membership?.organizationId ?? null
  } catch (error) {
    console.error('[getCurrentOrganizationId] Erro ao resolver organização:', error)
    return null
  }
}
