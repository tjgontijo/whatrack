import { NextResponse } from 'next/server'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      const isUnauthenticated = access.error === 'Usuário não autenticado'
      return NextResponse.json(
        { error: access.error || 'Acesso negado' },
        { status: isUnauthenticated ? 401 : 403 }
      )
    }

    const configs = await MetaCloudService.getAllConfigs(access.organizationId)

    console.log('[API] PhoneNumbers - activeOrg:', access.organizationId)
    console.log('[API] PhoneNumbers - configs found:', configs.length)

    if (configs.length === 0) {
      return NextResponse.json({
        phoneNumbers: [],
        configured: false,
        message: 'Nenhuma instância WhatsApp configurada. Conecte sua conta para começar.',
      })
    }

    // Aggregate phone numbers from all unique WABAs
    const wabaIds = Array.from(new Set(configs.map((c) => c.wabaId).filter(Boolean))) as string[]
    let allPhoneNumbers: any[] = []

    for (const wabaId of wabaIds) {
      try {
        // Find any config for this WABA to get the token
        const wabaConfig = configs.find((c) => c.wabaId === wabaId)
        const token = wabaConfig ? resolveAccessToken(wabaConfig.accessToken) : undefined
        const numbers = await MetaCloudService.listPhoneNumbers({
          wabaId,
          accessToken: token || undefined,
        })
        allPhoneNumbers = [...allPhoneNumbers, ...numbers]
      } catch (err: any) {
        console.error(`[API] Failed to fetch numbers for WABA ${wabaId}:`, err)
      }
    }

    // Remover duplicatas caso existam
    const uniquePhonesMap = new Map()
    allPhoneNumbers.forEach((p) => uniquePhonesMap.set(p.id, p))
    const uniquePhones = Array.from(uniquePhonesMap.values())

    return NextResponse.json({ phoneNumbers: uniquePhones })
  } catch (error: any) {
    console.error('[API] List Phone Numbers Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch phone numbers' },
      { status: 500 }
    )
  }
}
