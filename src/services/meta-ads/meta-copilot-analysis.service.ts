import axios from 'axios'
import { Agent } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'

import { prisma } from '@/lib/db/prisma'
import {
  analysisMapZodSchema,
  type MetaCopilotAnalyzeRequestInput,
} from '@/schemas/meta-ads/meta-ads-schemas'
import { metaAccessTokenService } from '@/services/meta-ads/access-token.service'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[meta-copilot-analysis] ${name} environment variable is required`)
  return value
}

const SYSTEM_PROMPT = `Você é um Analista de BI e Performance sênior especializado em Meta Ads.
Sua única função é analisar dados de campanhas e fornecer diagnósticos profundos e analíticos.

REGRAS ESTRITAS:
1. FOCO NO DIAGNÓSTICO: Priorize a identificação clara de tendências, sazonalidade e eficiência.
2. CONTEXTO MACRO: Atente-se aos dias da semana informados na timeline e relacione com eventos, feriados ou comportamentos de 'final de semana' vs 'dias úteis'. Use a sua base de dados externa se o período coincidir com feriados nacionais do Brasil (como Carnaval, feriados prolongados, etc).
3. ESTRUTURA DA CAMPANHA: Note quais conjuntos de anúncio (AdSets) e criativos (Ads) estão puxando o resultado para cima ou para baixo (você receberá os maiores gastadores).
4. LINGUAGEM DE BI: Use jargões corretos e foque na correlação dos dados reais.
5. RECOMENDAÇÕES: Formule planos de ação embasados no contexto temporal e estrutural.`

type MetricAction = {
  action_type: string
  value: string | number
}

type InsightRow = {
  date_start?: string
  spend?: string | number
  impressions?: string | number
  clicks?: string | number
  inline_link_clicks?: string | number
  adset_name?: string
  ad_name?: string
  actions?: MetricAction[]
  action_values?: MetricAction[]
}

function getActionVal(list: MetricAction[] | undefined, actionType: string) {
  const source = list ?? []
  let item = source.find((action) => action.action_type === actionType)
  if (!item) {
    item = source.find((action) => action.action_type === `offsite_conversion.fb_pixel_${actionType}`)
  }

  return item ? Number(item.value) : 0
}

function mapAggregates(data: InsightRow[], nameField: 'adset_name' | 'ad_name') {
  return data
    .map((item) => {
      const actions = item.actions || []
      const actionValues = item.action_values || []
      const spend = Number(item.spend || 0)
      const purchases = getActionVal(actions, 'purchase')
      const revenue = getActionVal(actionValues, 'purchase')

      return {
        name: item[nameField] || 'Desconhecido',
        spend,
        purchases,
        cpa: purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0,
        roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
        clicks: Number(item.inline_link_clicks || item.clicks || 0),
      }
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
}

interface RunMetaCopilotAnalysisInput {
  organizationId: string
  request: MetaCopilotAnalyzeRequestInput
}

export async function runMetaCopilotAnalysis(input: RunMetaCopilotAnalysisInput) {
  const account = await prisma.metaAdAccount.findFirst({
    where: {
      organizationId: input.organizationId,
      adAccountId: input.request.accountId,
    },
    select: { connectionId: true },
  })

  if (!account) {
    return { error: 'Account not found' as const, status: 404 as const }
  }

  const token = await metaAccessTokenService.getDecryptedToken(account.connectionId)

  const dateStart = new Date()
  dateStart.setDate(dateStart.getDate() - (input.request.days - 1))
  const dateStartStr = dateStart.toISOString().split('T')[0]
  const dateEndStr = new Date().toISOString().split('T')[0]

  const commonParams = {
    access_token: token,
    time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
    fields: 'spend,impressions,clicks,inline_link_clicks,reach,actions,action_values',
  }

  const endpoint = `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${input.request.campaignId}/insights`

  const [campaignDailyRes, adsetsRes, adsRes] = await Promise.all([
    axios
      .get(endpoint, {
        params: { ...commonParams, time_increment: 1 },
      })
      .catch(() => ({ data: { data: [] } })),
    axios
      .get(endpoint, {
        params: {
          ...commonParams,
          level: 'adset',
          fields: `${commonParams.fields},adset_name`,
        },
      })
      .catch(() => ({ data: { data: [] } })),
    axios
      .get(endpoint, {
        params: {
          ...commonParams,
          level: 'ad',
          fields: `${commonParams.fields},ad_name`,
        },
      })
      .catch(() => ({ data: { data: [] } })),
  ])

  const rawData = ((campaignDailyRes.data as { data?: InsightRow[] }).data ?? []) as InsightRow[]
  const rawAdsets = ((adsetsRes.data as { data?: InsightRow[] }).data ?? []) as InsightRow[]
  const rawAds = ((adsRes.data as { data?: InsightRow[] }).data ?? []) as InsightRow[]

  const timeline = rawData.map((dayData) => {
    const actions = dayData.actions || []
    const actionValues = dayData.action_values || []
    const spend = Number(dayData.spend || 0)
    const clicks = Number(dayData.inline_link_clicks || dayData.clicks || 0)
    const purchases = getActionVal(actions, 'purchase')
    const revenue = getActionVal(actionValues, 'purchase')
    const initiateCheckout = getActionVal(actions, 'initiate_checkout')
    const landingPageViews = getActionVal(actions, 'landing_page_view')

    const dateString = dayData.date_start || new Date().toISOString().split('T')[0]
    const dateObj = new Date(`${dateString}T12:00:00Z`)

    return {
      date: dateString,
      dayOfWeek: dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }),
      spend,
      impressions: Number(dayData.impressions || 0),
      clicks,
      cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
      lpv: landingPageViews,
      cpv: landingPageViews > 0 ? Number((spend / landingPageViews).toFixed(2)) : 0,
      ic: initiateCheckout,
      cpaIc: initiateCheckout > 0 ? Number((spend / initiateCheckout).toFixed(2)) : 0,
      purchases,
      cpa: purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0,
      revenue,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    }
  })

  const topAdsets = mapAggregates(rawAdsets, 'adset_name')
  const topAds = mapAggregates(rawAds, 'ad_name')

  const activeDays = timeline.filter((day) => day.spend > 0)
  if (activeDays.length < 7) {
    return {
      error: 'Campanha muito recente para análise estatística segura' as const,
      detail: `A campanha possui apenas ${activeDays.length} dias ativos com gasto (sendo necessários pelo menos 7). Deixe-a performar mais tempo ou estenda o limite de dias global da análise.`,
      status: 400 as const,
    }
  }

  const mastraAgent = new Agent({
    name: 'Meta Ads Copilot',
    id: 'meta-ads-copilot',
    instructions: SYSTEM_PROMPT,
    model: openai('gpt-4o'),
  })

  const prompt = `Analise a campanha "${input.request.campaignName}" com base nestes dados dos últimos ${input.request.days} dias:

TIMELINE (Diário):
${JSON.stringify(timeline, null, 2)}

TOP 5 CONJUNTOS DE ANÚNCIO (AGREGADO NO PERÍODO):
${JSON.stringify(topAdsets, null, 2)}

TOP 5 CRIATIVOS/ANÚNCIOS (AGREGADO NO PERÍODO):
${JSON.stringify(topAds, null, 2)}

Produza a análise solicitada avaliando também performance de dias da semana e os maiores gastadores acima.`

  const result = await mastraAgent.generate(prompt, {
    structuredOutput: { schema: analysisMapZodSchema },
  })

  return {
    data: {
      success: true,
      timeline,
      analysis: result.object,
    },
  }
}
