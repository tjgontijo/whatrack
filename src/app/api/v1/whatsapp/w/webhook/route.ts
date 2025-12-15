import { NextResponse } from 'next/server'

// Endpoint legado mantido apenas para compatibilidade; recomenda-se usar /api/v1/whatsapp/webhook/[id]
export async function POST() {
    return NextResponse.json({ ok: true })
}
