import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import {
  metaAdsMetricPayloadSchema,
  type MetaAdsMetricInput,
} from '@/lib/schema/lead-tickets'


function normalizePayloadItem(item: MetaAdsMetricInput, organizationId: string) {
  const reportDate = new Date(item.reportDate)
  if (Number.isNaN(reportDate.getTime())) {
    throw new Error(`Data inválida: ${item.reportDate}`)
  }

  return {
    organizationId,
    reportDate,
    campaign: item.campaign,
    campaignId: item.campaignId,
    adset: item.adset,
    adsetId: item.adsetId,
    ad: item.ad,
    adId: item.adId,
    impressions: item.impressions,
    clicks: item.clicks,
    results: item.results,
    cost: new Prisma.Decimal(item.cost),
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id')
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization header' }, { status: 400 })
    }

    const providedKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const expectedKey = process.env.META_ADS_METRICS_API_KEY

    if (!expectedKey) {
      console.error('[api/v1/meta-ads/metrics] Missing META_ADS_METRICS_API_KEY environment variable')
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
    }

    if (providedKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const payload = metaAdsMetricPayloadSchema.parse(json)

    const data = payload.map((item) => normalizePayloadItem(item, organizationId))

    if (!data.length) {
      return NextResponse.json({ inserted: 0 })
    }

    const result = await prisma.metaAdsMetric.createMany({ data, skipDuplicates: true })

    return NextResponse.json({ inserted: result.count })
  } catch (error) {
    console.error('[api/v1/meta-ads/metrics] POST error', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: 'Erro ao salvar métricas', code: error.code }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to persist metrics', details: String(error) }, { status: 500 })
  }
}
