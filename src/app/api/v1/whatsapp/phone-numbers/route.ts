import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const configs = await MetaCloudService.getAllConfigs(session.session.activeOrganizationId)

        console.log('[API] PhoneNumbers - activeOrg:', session.session.activeOrganizationId)
        console.log('[API] PhoneNumbers - configs found:', configs.length)

        if (configs.length === 0) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        // Aggregate phone numbers from all unique WABAs
        const wabaIds = Array.from(new Set(configs.map(c => c.wabaId).filter(Boolean))) as string[]
        let allPhoneNumbers: any[] = []

        for (const wabaId of wabaIds) {
            try {
                // Find any config for this WABA to get the token
                const wabaConfig = configs.find(c => c.wabaId === wabaId)
                const numbers = await MetaCloudService.listPhoneNumbers({
                    wabaId,
                    accessToken: wabaConfig?.accessToken ?? undefined
                })
                allPhoneNumbers = [...allPhoneNumbers, ...numbers]
            } catch (err: any) {
                console.error(`[API] Failed to fetch numbers for WABA ${wabaId}:`, err)
            }
        }

        // Remover duplicatas caso existam
        const uniquePhonesMap = new Map();
        allPhoneNumbers.forEach(p => uniquePhonesMap.set(p.id, p));
        const uniquePhones = Array.from(uniquePhonesMap.values());

        return NextResponse.json({ phoneNumbers: uniquePhones })
    } catch (error: any) {
        console.error('[API] List Phone Numbers Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch phone numbers' },
            { status: 500 }
        )
    }
}
