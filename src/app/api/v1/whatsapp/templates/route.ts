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

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const config = await MetaCloudService.getConfig(session.session.activeOrganizationId)

        if (!config || !config.wabaId || !config.accessToken) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        const result = await MetaCloudService.createTemplate({
            wabaId: config.wabaId,
            accessToken: config.accessToken,
            template: body,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API] Create Template Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create template' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const name = searchParams.get('name')

        if (!name) {
            return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
        }

        const config = await MetaCloudService.getConfig(session.session.activeOrganizationId)

        if (!config || !config.wabaId || !config.accessToken) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        const result = await MetaCloudService.deleteTemplate({
            wabaId: config.wabaId,
            accessToken: config.accessToken,
            name,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API] Delete Template Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete template' },
            { status: 500 }
        )
    }
}
