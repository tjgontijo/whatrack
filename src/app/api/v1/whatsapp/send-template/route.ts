import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
    to: z.string().min(1),
    templateName: z.string().min(1),
})

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { to, templateName } = sendSchema.parse(body)

        const config = await MetaCloudService.getConfig(session.session.activeOrganizationId)

        if (!config || !config.phoneId || !config.accessToken) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        const result = await MetaCloudService.sendTemplate({
            phoneId: config.phoneId,
            to,
            templateName,
            accessToken: config.accessToken,
        })

        return NextResponse.json({ success: true, result })
    } catch (error: any) {
        console.error('[API] Send Template Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send message' },
            { status: 500 }
        )
    }
}
