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

        const config = await MetaCloudService.getConfig(session.session.activeOrganizationId)

        if (!config || !config.wabaId || !config.accessToken) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        const templates = await MetaCloudService.getTemplates({
            wabaId: config.wabaId,
            accessToken: config.accessToken,
        })

        return NextResponse.json({ templates })
    } catch (error: any) {
        console.error('[API] Get Templates Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch templates' },
            { status: 500 }
        )
    }
}
